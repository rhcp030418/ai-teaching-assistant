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
  MAX_COMMENTS_IN_ANALYSIS,
} from "@/lib/constants";

export interface CauseAnalysisResult {
  causes: {
    axis: string;
    observation: string;
    possibleCause: string;
    materialEvidence: string | null;
  }[];
  actionItems: string[];
}

export async function analyzeCauses(
  courseId: string
): Promise<{ success: boolean; result?: CauseAnalysisResult; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "인증 필요" };

  const course = await prisma.course.findUnique({
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
          comment: true,
          filteredComment: true,
        },
      },
      lectureMaterials: {
        where: { analysis: { not: null } },
        select: { fileName: true, analysis: true },
      },
    },
  });

  if (!course) {
    return { success: false, error: "강의를 찾을 수 없습니다." };
  }

  if (course.feedbacks.length < FEEDBACK_MIN_COUNT) {
    return { success: false, error: "피드백이 3건 이상이어야 원인 분석이 가능합니다." };
  }

  // Build feedback summary
  const {
    total, speedCounts, compCounts, commSum,
    interestSum, interestCount,
    assignmentSum, assignmentCount,
    practiceSum, practiceCount,
  } = computeFeedbackCounts(course.feedbacks);

  const comments = course.feedbacks
    .map((fb) => fb.filteredComment ?? fb.comment)
    .filter((c): c is string => c != null);

  const commAvg = Math.round((commSum / total) * 10) / 10;

  const speedModPct = Math.round((speedCounts.moderate / total) * 100);
  const speedFastPct = Math.round((speedCounts.fast / total) * 100);
  const speedSlowPct = Math.round((speedCounts.slow / total) * 100);
  const compHighPct = Math.round((compCounts.high / total) * 100);
  const compMedPct = Math.round((compCounts.medium / total) * 100);
  const compLowPct = Math.round((compCounts.low / total) * 100);

  // 기준선 대비 이상 여부 표시
  const flags: string[] = [];
  if (speedModPct < SPEED_MODERATE_THRESHOLD) flags.push(`속도 '적당' ${speedModPct}% (기준 50% 미달)`);
  if (compHighPct < COMP_HIGH_THRESHOLD) flags.push(`이해도 '높음' ${compHighPct}% (기준 50% 미달)`);
  if (commAvg < COMM_AVG_THRESHOLD) flags.push(`소통 만족도 ${commAvg}/5 (기준 3.5 미달)`);
  if (interestCount > 0 && interestSum / interestCount < COMM_AVG_THRESHOLD)
    flags.push(`흥미도 ${(interestSum / interestCount).toFixed(1)}/5 (기준 3.5 미달)`);

  const commentList = comments.slice(0, MAX_COMMENTS_IN_ANALYSIS)
    .map((c, i) => `  ${i + 1}. ${c}`)
    .join("\n");

  const extraLines: string[] = [];
  if (interestCount > 0) extraLines.push(`- 강의 흥미도: ${(interestSum / interestCount).toFixed(1)}/5 (${interestCount}건)`);
  if (assignmentCount > 0) extraLines.push(`- 과제 적절성: ${(assignmentSum / assignmentCount).toFixed(1)}/5 (${assignmentCount}건)`);
  if (practiceCount > 0) extraLines.push(`- 실습/예시 충분도: ${(practiceSum / practiceCount).toFixed(1)}/5 (${practiceCount}건)`);

  const feedbackSummary = `[피드백 요약 (총 ${total}건)]
강의명: ${course.name}
- 수업 속도: 빠름 ${speedFastPct}% / 적당 ${speedModPct}% / 느림 ${speedSlowPct}%
- 자료 이해도: 높음 ${compHighPct}% / 보통 ${compMedPct}% / 낮음 ${compLowPct}%
- 소통 만족도: 평균 ${commAvg}/5${extraLines.length > 0 ? "\n" + extraLines.join("\n") : ""}
${flags.length > 0 ? `\n[주의 지표]\n${flags.map(f => "  * " + f).join("\n")}` : "\n[모든 지표 기준선 충족]"}
- 학생 의견 (${Math.min(comments.length, 20)}건):
${commentList || "  (없음)"}`;

  // Build material analysis summary
  let materialSummary = "[강의자료 분석 결과 없음]";

  if (course.lectureMaterials.length > 0) {
    const parts: string[] = [];
    for (const m of course.lectureMaterials) {
      try {
        const a = JSON.parse(m.analysis!);
        // improvements는 과거 string[] 또는 현재 ImprovementDetail 객체일 수 있음
        const imp = a.improvements;
        const improvementsText = !imp
          ? "없음"
          : Array.isArray(imp)
            ? imp.join("; ")
            : [imp.structure, imp.examples, imp.pedagogy].filter(Boolean).join("; ") || "없음";

        parts.push(`파일: ${m.fileName}
  - 요약: ${a.summary}
  - 난이도: ${a.difficulty} (${a.difficultyReason})
  - 용어 밀도: ${a.termDensity} (예: ${(a.termExamples || []).join(", ")})
  - 예시 충분도: ${a.exampleSufficiency} (${a.exampleFeedback})
  - 개선 제안: ${improvementsText}`);
      } catch {
        // skip malformed analysis
      }
    }
    if (parts.length > 0) {
      materialSummary = `[강의자료 분석 결과 (${parts.length}개)]\n${parts.join("\n\n")}`;
    }
  }


  try {
    const response = await chatWithAI([
      {
        role: "system",
        content: `당신은 10년 경력의 대학 강의 개선 전문 컨설턴트입니다. 학생 피드백 데이터와 강의자료 분석 결과를 교차 분석하여 교수님이 다음 수업에서 바로 실천할 수 있는 구체적 인사이트를 제공합니다.

JSON 응답 전에 반드시 다음 분석 단계를 거치세요 (응답에는 포함하지 않음):
1단계: [주의 지표] 항목에서 기준선 미달 지표를 확인합니다.
2단계: 학생 의견들을 읽고 각 지표와 연결되는 키워드나 패턴을 찾습니다.
3단계: 강의자료 분석에서 해당 지표와 관련된 근거를 찾습니다.
4단계: 원인과 행동 계획을 최종 확정합니다.

출력 원칙:
- "~일 수 있습니다", "~가능성이 있습니다" 톤 사용
- observation에 반드시 수치 포함
- possibleCause에 학생 의견을 직접 인용하거나 반복 패턴 언급
- actionItems는 causes 순서대로 1:1 대응, "다음 수업에서 ~" 형식으로 언제·무엇을·얼마나 명시
- 마크다운 문법(**, *, -, #, \`\`\` 등) 절대 사용 금지

${TEACHING_TOOLBOX}

각 actionItems는 위 도구상자에서 문제에 맞는 기법을 골라 구체적 실천 행동으로 작성하고, 기법 이름을 괄호로 표기하세요.

자가 검증 (JSON 작성 전 내부 점검, 응답에는 포함하지 않음):
- observation에 수치(%)가 포함되어 있는가?
- possibleCause에 학생 의견 인용이나 반복 패턴이 언급되어 있는가?
- actionItems가 "다음 수업에서 ~" 형식으로, 언제·무엇을·얼마나 명시되어 있는가?
- actionItems가 [검증된 교수법 도구상자]의 기법에 기반하며 기법명이 괄호로 표기되어 있는가?

--- 좋은 출력 예시 ---
{
  "causes": [{
    "axis": "자료 이해도",
    "observation": "이해도 '높음' 비율이 32%로, 전체 응답자의 68%가 강의 내용을 충분히 소화하지 못하고 있습니다.",
    "possibleCause": "5명의 학생이 '예시가 없어서 이해가 안 된다'고 언급하였으며, 강의자료 분석에서도 예시 충분도가 '낮음'으로 평가된 점을 볼 때, 이론 중심의 설명 방식이 이해도를 저하시키고 있을 가능성이 높습니다.",
    "materialEvidence": "업로드된 강의자료의 예시 충분도 분석 결과: '낮음' (슬라이드 20장 중 예시 포함 2장)"
  }],
  "actionItems": ["다음 수업 도입부 5분 동안, 지난 시간의 핵심 개념 하나를 학생이 먼저 떠올려 적게 한 뒤 실생활 사례 2가지로 복습합니다 (인출 연습/retrieval practice). 이후 본 강의에서도 추상적 정의보다 예시를 먼저 제시하고 거기서 개념을 끌어내는 루틴을 유지하세요 (구체적 예시 우선/concrete examples)."]
}

--- 나쁜 출력 예시 (금지) ---
{
  "causes": [{"axis": "자료 이해도", "observation": "이해도가 낮습니다.", "possibleCause": "학생들이 이해를 못하고 있을 수 있습니다.", "materialEvidence": null}],
  "actionItems": ["설명을 더 잘 해주세요."]
}
--- 예시 끝 ---

반드시 위 JSON 형식으로만 응답하세요. causes는 [주의 지표]에 있는 항목 위주 1~3개, 모든 지표 양호하면 빈 배열도 가능합니다.`,
      },
      {
        role: "user",
        content: `다음 데이터를 교차 분석하여 원인을 추정해주세요.

${feedbackSummary}

${materialSummary}`,
      },
    ], { temperature: 0.2 });

    let result: CauseAnalysisResult;
    try {
      result = parseAIJson<CauseAnalysisResult>(response.content);
    } catch {
      return { success: false, error: "AI 응답을 파싱할 수 없습니다." };
    }

    return { success: true, result };
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI 분석 실패";
    return { success: false, error: message };
  }
}
