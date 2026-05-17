"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { chatWithAI } from "@/lib/ai";
import { parseAIJson } from "@/lib/parse-ai-json";

export interface ChecklistItem {
  priority: "urgent" | "important" | "optional";
  category: "content" | "pace" | "communication" | "material";
  action: string;
  reason: string;
}

export interface ClassChecklist {
  roundLabel: string;
  items: ChecklistItem[];
  encouragement: string;
}

function isValidItem(item: unknown): item is ChecklistItem {
  if (!item || typeof item !== "object") return false;
  const i = item as Record<string, unknown>;
  return (
    (i.priority === "urgent" || i.priority === "important" || i.priority === "optional") &&
    (i.category === "content" || i.category === "pace" || i.category === "communication" || i.category === "material") &&
    typeof i.action === "string" && i.action.trim().length > 0 &&
    typeof i.reason === "string" && i.reason.trim().length > 0
  );
}

function isValidChecklist(data: unknown): data is ClassChecklist {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.roundLabel === "string" &&
    Array.isArray(d.items) &&
    d.items.length > 0 &&
    d.items.every(isValidItem) &&
    typeof d.encouragement === "string"
  );
}

export async function generateClassChecklist(
  courseId: string,
  roundId: string,
): Promise<{ success: boolean; result?: ClassChecklist; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "인증 필요" };

  const round = await prisma.feedbackRound.findFirst({
    where: { id: roundId, course: { professorId: session.user.id } },
    include: {
      course: {
        select: { id: true, name: true, category: true, hasAssignment: true, hasPractice: true },
      },
      feedbacks: {
        select: {
          speed: true,
          comprehension: true,
          communication: true,
          interest: true,
          assignment: true,
          practice: true,
          filteredComment: true,
        },
      },
      lectureMaterials: {
        select: { fileName: true, analysis: true },
      },
    },
  });

  if (!round) return { success: false, error: "라운드를 찾을 수 없습니다." };

  const fbs = round.feedbacks;
  if (fbs.length < 3) return { success: false, error: "피드백이 3건 이상이어야 체크리스트 생성이 가능합니다." };

  const roundLabel = round.label ?? `${round.week}주차`;
  const total = fbs.length;

  const speedMod = Math.round((fbs.filter((f) => f.speed === "moderate").length / total) * 100);
  const speedFast = Math.round((fbs.filter((f) => f.speed === "fast").length / total) * 100);
  const speedSlow = Math.round((fbs.filter((f) => f.speed === "slow").length / total) * 100);
  const compHigh = Math.round((fbs.filter((f) => f.comprehension === "high").length / total) * 100);
  const compMed = Math.round((fbs.filter((f) => f.comprehension === "medium").length / total) * 100);
  const compLow = Math.round((fbs.filter((f) => f.comprehension === "low").length / total) * 100);
  const commAvg = fbs.reduce((s, f) => s + f.communication, 0) / total;

  const interestVals = fbs.filter((f) => f.interest != null).map((f) => f.interest as number);
  const assignVals = fbs.filter((f) => f.assignment != null).map((f) => f.assignment as number);
  const practiceVals = fbs.filter((f) => f.practice != null).map((f) => f.practice as number);
  const arrAvg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

  const comments = fbs
    .map((f) => f.filteredComment)
    .filter((c): c is string => c != null);

  // 이전 라운드 조회 (트렌드 비교용)
  const prevRound = await prisma.feedbackRound.findFirst({
    where: { courseId: round.courseId, week: { lt: round.week } },
    orderBy: { week: "desc" },
    include: {
      feedbacks: {
        select: { speed: true, comprehension: true, communication: true },
      },
    },
  });

  const dataLines: string[] = [
    `강의명: ${round.course.name}`,
    `주차: ${roundLabel} (피드백 ${total}건)`,
    `수업 속도: 빠름 ${speedFast}% / 적당 ${speedMod}% / 느림 ${speedSlow}%`,
    `자료 이해도: 높음 ${compHigh}% / 보통 ${compMed}% / 낮음 ${compLow}%`,
    `소통 만족도: ${commAvg.toFixed(1)}/5`,
  ];

  if (interestVals.length > 0) dataLines.push(`강의 흥미도: ${arrAvg(interestVals)!.toFixed(1)}/5`);
  if (assignVals.length > 0) dataLines.push(`과제 적절성: ${arrAvg(assignVals)!.toFixed(1)}/5`);
  if (practiceVals.length > 0) dataLines.push(`실습/예시 충분도: ${arrAvg(practiceVals)!.toFixed(1)}/5`);

  // 기준선 대비 주의 지표
  const flags: string[] = [];
  if (speedMod < 50) flags.push(`속도 '적당' ${speedMod}% (기준 50% 미달)`);
  if (compHigh < 50) flags.push(`이해도 '높음' ${compHigh}% (기준 50% 미달)`);
  if (commAvg < 3.5) flags.push(`소통 만족도 ${commAvg.toFixed(1)}/5 (기준 3.5 미달)`);
  if (flags.length > 0) {
    dataLines.push(`\n[주의 지표]\n${flags.map((f) => `  * ${f}`).join("\n")}`);
  }

  if (comments.length > 0) {
    dataLines.push(`\n학생 의견 (${Math.min(comments.length, 10)}건):\n${comments.slice(0, 10).map((c, i) => `  ${i + 1}. ${c}`).join("\n")}`);
  }

  if (prevRound && prevRound.feedbacks.length > 0) {
    const pFbs = prevRound.feedbacks;
    const pTotal = pFbs.length;
    const pCommAvg = pFbs.reduce((s, f) => s + f.communication, 0) / pTotal;
    const pCompHigh = Math.round((pFbs.filter((f) => f.comprehension === "high").length / pTotal) * 100);
    const pSpeedMod = Math.round((pFbs.filter((f) => f.speed === "moderate").length / pTotal) * 100);
    const prevLabel = prevRound.label ?? `${prevRound.week}주차`;
    dataLines.push(`\n[이전 ${prevLabel} 대비 변화]`);
    const commDelta = Math.round((commAvg - pCommAvg) * 10) / 10;
    const compDelta = compHigh - pCompHigh;
    const speedDelta = speedMod - pSpeedMod;
    dataLines.push(`  소통: ${pCommAvg.toFixed(1)} → ${commAvg.toFixed(1)} (${commDelta >= 0 ? "+" : ""}${commDelta})`);
    dataLines.push(`  이해도: ${pCompHigh}% → ${compHigh}% (${compDelta >= 0 ? "+" : ""}${compDelta}%p)`);
    dataLines.push(`  속도적절: ${pSpeedMod}% → ${speedMod}% (${speedDelta >= 0 ? "+" : ""}${speedDelta}%p)`);
  }

  // 연결된 강의자료 분석
  const matParts: string[] = [];
  for (const mat of round.lectureMaterials) {
    if (!mat.analysis) {
      matParts.push(`  ${mat.fileName}: 분석 전`);
      continue;
    }
    try {
      const a = JSON.parse(mat.analysis) as Record<string, unknown>;
      const imp = a.improvements as Record<string, unknown> | null | undefined;
      const impText = imp
        ? [imp.structure, imp.examples, imp.pedagogy].filter(Boolean).join("; ") || null
        : null;
      matParts.push(
        `  ${mat.fileName}: 난이도 ${a.difficulty}, 예시 ${a.exampleSufficiency}` +
        (impText ? ` / 개선제안: ${impText}` : ""),
      );
    } catch {
      // skip malformed
    }
  }
  if (matParts.length > 0) {
    dataLines.push(`\n[이번 주차 강의자료 분석]\n${matParts.join("\n")}`);
  }

  try {
    const response = await chatWithAI([
      {
        role: "system",
        content: `당신은 10년 경력의 대학 강의 개선 전문 컨설턴트입니다. 이번 주차 피드백과 강의자료 분석을 교차하여 다음 수업 전 준비 체크리스트를 작성합니다.

JSON 응답 전 반드시 아래 3단계를 거치세요 (응답에는 포함하지 않음):
1단계: [주의 지표]에서 가장 시급한 문제 1개를 특정합니다. 없으면 "전체 양호"로 표시.
2단계: [이번 주차 강의자료 분석]이 있다면 피드백 지표와 교차합니다.
  - 이해도 낮음 + 강의자료 난이도 '상' → category:content, priority:urgent
  - 실습 점수 낮음 + 강의자료 예시 '부족' → category:content, priority:urgent
  - 속도 부적절 + 강의자료 용어밀도 '높음' → category:pace, priority:important
  - 두 데이터가 일치하는 경우 해당 action의 reason에 반드시 두 수치를 함께 인용
3단계: 개선 제안(improvements)이 있다면 구체적 action으로 변환합니다.

체크리스트 작성 규칙:
- items는 2~5개. 핵심만. [주의 지표] 없으면 optional 1~2개만.
- priority: "urgent"=반드시, "important"=권장, "optional"=여건이 되면
- category: "content"(내용/자료), "pace"(속도/진도), "communication"(소통/질문), "material"(자료 업데이트)
- action: "다음 수업 전에 ~하세요" 형식, 구체적 시간·행동·분량 명시
- reason: 피드백 수치 + 강의자료 분석 수치 동시 인용 (가능한 경우)
- encouragement: 잘 된 지표 수치를 언급하는 격려 1문장
- 마크다운 문법(**, *, -, #) 절대 사용 금지

--- 좋은 예시 ---
{
  "roundLabel": "4주차",
  "items": [
    {
      "priority": "urgent",
      "category": "content",
      "action": "다음 수업 전에 핵심 개념 3개에 대해 실생활 예시를 각 2개씩 준비하세요.",
      "reason": "이해도 높음 32%(기준 50% 미달)이며, 강의자료 예시 충분도가 '부족'으로 분석된 점이 일치합니다. 학생 3명이 '예시가 없어 이해가 안 된다'고 언급했습니다."
    }
  ],
  "encouragement": "소통 만족도 4.2/5로 교수님과 학생 간 소통은 이 강의의 강점입니다."
}

반드시 위 JSON 형식으로만 응답하세요.`,
      },
      {
        role: "user",
        content: `다음 데이터를 바탕으로 다음 수업 준비 체크리스트를 생성해주세요.\n\n${dataLines.join("\n")}`,
      },
    ], { temperature: 0.3 });

    let parsed: unknown;
    try {
      parsed = parseAIJson<unknown>(response.content);
    } catch {
      return { success: false, error: "AI 응답을 파싱할 수 없습니다." };
    }

    if (!isValidChecklist(parsed)) {
      return { success: false, error: "AI 응답 구조가 올바르지 않습니다. 다시 시도해주세요." };
    }

    return { success: true, result: parsed };
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI 분석 실패";
    return { success: false, error: message };
  }
}
