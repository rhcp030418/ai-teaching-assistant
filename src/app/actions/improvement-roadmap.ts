"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { chatWithAI } from "@/lib/ai";
import { parseAIJson } from "@/lib/parse-ai-json";
import { computeFeedbackCounts } from "@/lib/feedback-stats";
import { TEACHING_TOOLBOX } from "@/lib/teaching-methods";
import {
  FEEDBACK_MIN_COUNT,
  COMM_AVG_THRESHOLD,
  SPEED_MODERATE_THRESHOLD,
  COMP_HIGH_THRESHOLD,
  MAX_COMMENTS_IN_ROADMAP,
} from "@/lib/constants";

export interface RoadmapPriority {
  rank: number;
  area: string;
  problem: string;
  action: string;
  evidence: string;
  impact: "high" | "medium" | "low";
}

export interface ImprovementRoadmapData {
  priorities: RoadmapPriority[];
  weeklyGoal: string;
  summary: string;
}

function isValidPriority(p: unknown): p is RoadmapPriority {
  if (!p || typeof p !== "object") return false;
  const item = p as Record<string, unknown>;
  return (
    typeof item.rank === "number" &&
    typeof item.area === "string" &&
    typeof item.problem === "string" &&
    typeof item.action === "string" &&
    typeof item.evidence === "string" &&
    (item.impact === "high" || item.impact === "medium" || item.impact === "low")
  );
}

function isValidRoadmap(data: unknown): data is ImprovementRoadmapData {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    Array.isArray(d.priorities) &&
    d.priorities.length > 0 &&
    d.priorities.every(isValidPriority) &&
    typeof d.weeklyGoal === "string" &&
    typeof d.summary === "string"
  );
}

export async function generateRoadmap(
  courseId: string,
): Promise<{ success: boolean; result?: ImprovementRoadmapData; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "인증 필요" };

  const course = await prisma.course.findFirst({
    where: { id: courseId, professorId: session.user.id },
    include: {
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
        where: { analysis: { not: null } },
        select: { fileName: true, analysis: true },
      },
      feedbackRounds: {
        orderBy: { week: "asc" },
        include: {
          feedbacks: {
            select: { speed: true, comprehension: true, communication: true },
          },
        },
      },
    },
  });

  if (!course) return { success: false, error: "강의를 찾을 수 없습니다." };
  if (course.feedbacks.length < FEEDBACK_MIN_COUNT) {
    return { success: false, error: "피드백이 3건 이상이어야 로드맵 생성이 가능합니다." };
  }

  const {
    total, speedCounts, compCounts, commSum,
    interestSum, interestCount,
    assignmentSum, assignmentCount,
    practiceSum, practiceCount,
  } = computeFeedbackCounts(course.feedbacks);

  const comments = course.feedbacks
    .map((fb) => fb.filteredComment)
    .filter((c): c is string => c != null);

  const roundSummaries = course.feedbackRounds
    .filter((r) => r.feedbacks.length > 0)
    .map((r) => {
      const fbs = r.feedbacks;
      const commAvg = (fbs.reduce((s, f) => s + f.communication, 0) / fbs.length).toFixed(1);
      const highComp = Math.round((fbs.filter((f) => f.comprehension === "high").length / fbs.length) * 100);
      const speedMod = Math.round((fbs.filter((f) => f.speed === "moderate").length / fbs.length) * 100);
      const label = r.label ?? `${r.week}주차`;
      return `${label}: 이해도 ${highComp}%, 소통 ${commAvg}/5, 속도적절 ${speedMod}%`;
    });

  const dataLines: string[] = [
    `강의명: ${course.name}`,
    `총 피드백: ${total}건`,
    `수업 속도: 빠름 ${Math.round((speedCounts.fast / total) * 100)}% / 적당 ${Math.round((speedCounts.moderate / total) * 100)}% / 느림 ${Math.round((speedCounts.slow / total) * 100)}%`,
    `이해도: 높음 ${Math.round((compCounts.high / total) * 100)}% / 보통 ${Math.round((compCounts.medium / total) * 100)}% / 낮음 ${Math.round((compCounts.low / total) * 100)}%`,
    `소통 만족도: ${(commSum / total).toFixed(1)}/5`,
  ];
  if (interestCount > 0) dataLines.push(`강의 흥미도: ${(interestSum / interestCount).toFixed(1)}/5`);
  if (assignmentCount > 0) dataLines.push(`과제 적절성: ${(assignmentSum / assignmentCount).toFixed(1)}/5`);
  if (practiceCount > 0) dataLines.push(`실습/예시 충분도: ${(practiceSum / practiceCount).toFixed(1)}/5`);
  if (roundSummaries.length > 0) {
    dataLines.push(`\n회차별 추이:\n${roundSummaries.map((r) => "  " + r).join("\n")}`);
  }
  // 기준선 대비 이상 지표 강조
  const flaggedAreas: string[] = [];
  const commAvgVal = commSum / total;
  if (Math.round((speedCounts.moderate / total) * 100) < SPEED_MODERATE_THRESHOLD) flaggedAreas.push("수업 속도 '적당' 비율이 50% 미달");
  if (Math.round((compCounts.high / total) * 100) < COMP_HIGH_THRESHOLD) flaggedAreas.push("이해도 '높음' 비율이 50% 미달");
  if (commAvgVal < COMM_AVG_THRESHOLD) flaggedAreas.push(`소통 만족도 ${commAvgVal.toFixed(1)}/5 (기준 3.5 미달)`);
  if (flaggedAreas.length > 0) {
    dataLines.push(`\n[즉시 개선 필요 지표]\n${flaggedAreas.map(f => "  * " + f).join("\n")}`);
  }

  if (comments.length > 0) {
    dataLines.push(`\n학생 의견 (${Math.min(comments.length, MAX_COMMENTS_IN_ROADMAP)}건):\n${comments.slice(0, MAX_COMMENTS_IN_ROADMAP).map((c, i) => `  ${i + 1}. ${c}`).join("\n")}`);
  }

  const matLines = course.lectureMaterials.map((m) => {
    try {
      const a = JSON.parse(m.analysis!);
      return `  ${m.fileName}: 난이도 ${a.difficulty}, 예시충분도 ${a.exampleSufficiency}`;
    } catch { return null; }
  }).filter((x): x is string => x !== null);
  if (matLines.length > 0) {
    dataLines.push(`\n강의자료:\n${matLines.join("\n")}`);
  }

  try {
    const response = await chatWithAI([
      {
        role: "system",
        content: `당신은 10년 경력의 대학 강의 개선 전문 컨설턴트입니다. 피드백 데이터를 분석하여 교수님이 다음 회차에 바로 실천할 수 있는 행동 계획을 제시합니다.

JSON 응답 전에 반드시 다음 분석 단계를 거치세요 (응답에는 포함하지 않음):
1단계: [즉시 개선 필요 지표]를 확인하여 가장 시급한 문제 1개를 특정합니다.
2단계: 학생 의견에서 그 문제와 연결되는 발언을 2~3개 찾습니다.
3단계: 그 발언을 근거로, 다음 수업에서 바로 할 수 있는 행동 하나를 도출합니다.
4단계: 도출한 행동을 아래 [검증된 교수법 도구상자]의 기법에 매핑하여 구체화합니다.
5단계: 나머지 지표들도 같은 방식으로 검토하여 우선순위를 완성합니다.

마크다운 문법 **,*,-,# 절대 사용 금지.

${TEACHING_TOOLBOX}

각 priorities의 action은 위 도구상자에서 문제에 맞는 기법을 골라 구체적 실천 행동으로 작성하고, 기법 이름을 괄호로 표기하세요.

--- 좋은 출력 예시 ---
{
  "priorities": [{
    "rank": 1,
    "area": "자료 이해도",
    "problem": "이해도 '높음' 비율이 32%로, 학생 3명 중 2명이 강의 내용을 충분히 소화하지 못하고 있습니다.",
    "action": "수업 시작 후 5분 동안 지난 수업 핵심 개념을 학생이 직접 떠올려 적게 한 뒤 판서로 정리합니다 (인출 연습/retrieval practice). 이어서 각 새 개념은 추상적 정의보다 실생활 예시를 먼저 제시하고 거기서 개념을 끌어내세요 (구체적 예시 우선/concrete examples).",
    "evidence": "학생 5명이 '예시가 없어서 이해가 안 된다'고 언급하였으며, 이해도 높음 비율이 32%로 낮게 나타납니다.",
    "impact": "high"
  }],
  "weeklyGoal": "각 개념 설명 후 예시 제시 루틴 도입으로 이해도 높음 비율을 현재 32%에서 50% 이상으로 끌어올립니다.",
  "summary": "소통 만족도 4.1/5로 교수님과 학생 간 소통은 이 강의의 강점입니다. 다만 이해도 높음이 32%에 그치고 있어, 설명 방식의 구체성 강화가 가장 시급한 과제입니다."
}

--- 나쁜 출력 예시 (금지) ---
{
  "priorities": [{"rank": 1, "area": "자료 이해도", "problem": "이해도가 낮습니다.", "action": "더 잘 가르치세요.", "evidence": "이해도가 낮기 때문입니다.", "impact": "high"}],
  "weeklyGoal": "이해도를 높입니다.",
  "summary": "강의가 좋습니다. 개선이 필요합니다."
}
--- 예시 끝 ---

[즉시 개선 필요 지표]에 있는 항목을 1순위로 하여 1~3개만 포함하세요. impact는 개선 시 학생 만족도 상승 기대치 기준입니다.

자가 검증 (JSON 작성 전 내부 점검, 응답에는 포함하지 않음):
- priorities의 problem에 현재 수치(%)가 포함되어 있는가?
- action이 구체적 시간, 행동, 루틴을 명시하고 있는가?
- action이 [검증된 교수법 도구상자]의 기법에 기반하며 기법명이 괄호로 표기되어 있는가?
- evidence에 학생 의견 인용이나 수치 근거가 있는가?
- weeklyGoal이 "현재 X% → 목표 Y%" 형식으로 작성되어 있는가?`,
      },
      {
        role: "user",
        content: `다음 강의 데이터를 분석하여 개선 로드맵을 생성해주세요.\n\n${dataLines.join("\n")}`,
      },
    ], { temperature: 0.2 });

    let parsed: unknown;
    try {
      parsed = parseAIJson<unknown>(response.content);
    } catch {
      return { success: false, error: "AI 응답을 파싱할 수 없습니다." };
    }

    if (!isValidRoadmap(parsed)) {
      return { success: false, error: "AI 응답 구조가 올바르지 않습니다. 다시 시도해주세요." };
    }

    return { success: true, result: parsed };
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI 분석 실패";
    return { success: false, error: message };
  }
}
