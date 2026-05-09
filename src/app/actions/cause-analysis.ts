"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { chatWithAI } from "@/lib/ai";
import { parseAIJson } from "@/lib/parse-ai-json";

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
      feedbacks: true,
      lectureMaterials: true,
    },
  });

  if (!course) {
    return { success: false, error: "강의를 찾을 수 없습니다." };
  }

  if (course.feedbacks.length < 3) {
    return { success: false, error: "피드백이 3건 이상이어야 원인 분석이 가능합니다." };
  }

  // Build feedback summary
  const total = course.feedbacks.length;
  const speedCounts = { fast: 0, moderate: 0, slow: 0 };
  const compCounts = { high: 0, medium: 0, low: 0 };
  let commSum = 0;
  const comments: string[] = [];

  for (const fb of course.feedbacks) {
    speedCounts[fb.speed as keyof typeof speedCounts]++;
    compCounts[fb.comprehension as keyof typeof compCounts]++;
    commSum += fb.communication;
    if (fb.comment) comments.push(fb.comment);
  }

  const commAvg = Math.round((commSum / total) * 10) / 10;

  const feedbackSummary = `[피드백 요약 (총 ${total}건)]
- 수업 속도: 빠름 ${Math.round((speedCounts.fast / total) * 100)}% / 적당 ${Math.round((speedCounts.moderate / total) * 100)}% / 느림 ${Math.round((speedCounts.slow / total) * 100)}%
- 자료 이해도: 높음 ${Math.round((compCounts.high / total) * 100)}% / 보통 ${Math.round((compCounts.medium / total) * 100)}% / 낮음 ${Math.round((compCounts.low / total) * 100)}%
- 소통 만족도: 평균 ${commAvg}/5
- 학생 의견: ${comments.length > 0 ? comments.slice(0, 10).join(" / ") : "없음"}`;

  // Build material analysis summary
  const analyzedMaterials = course.lectureMaterials.filter((m) => m.analysis);
  let materialSummary = "[강의자료 분석 결과 없음]";

  if (analyzedMaterials.length > 0) {
    const parts: string[] = [];
    for (const m of analyzedMaterials) {
      try {
        const a = JSON.parse(m.analysis!);
        parts.push(`파일: ${m.fileName}
  - 요약: ${a.summary}
  - 난이도: ${a.difficulty} (${a.difficultyReason})
  - 용어 밀도: ${a.termDensity} (예: ${(a.termExamples || []).join(", ")})
  - 예시 충분도: ${a.exampleSufficiency} (${a.exampleFeedback})
  - 개선 제안: ${(a.improvements || []).join("; ")}`);
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
        content: `당신은 대학 강의 개선 컨설턴트입니다. 학생 피드백 데이터와 강의자료 분석 결과를 함께 보고, 피드백 패턴의 가능한 원인을 추정합니다.

중요 원칙:
- 확정적 판단이 아닌 "~일 수 있습니다", "~가능성이 있습니다" 형태의 가능성 제시 톤을 사용하세요.
- 강의자료 분석 결과가 있으면 그것과 피드백을 교차 분석하여 구체적인 근거를 제시하세요.
- 강의자료 분석 결과가 없으면 피드백 데이터만으로 추정하되, 자료 확인을 권장하세요.
- 마크다운 문법(**, *, -, #, \`\`\` 등) 절대 사용 금지. 모든 텍스트 필드는 자연스러운 한국어 문장으로만 작성하세요.

반드시 다음 JSON 형식으로만 응답하세요:

{
  "causes": [
    {
      "axis": "수업 속도 / 자료 이해도 / 소통 만족도 중 하나",
      "observation": "해당 축에서 관찰된 패턴 1문장",
      "possibleCause": "가능한 원인 추정 1~2문장 (~일 수 있습니다 톤)",
      "materialEvidence": "강의자료에서 발견된 관련 근거 (없으면 null)"
    }
  ],
  "actionItems": ["구체적인 개선 제안 최대 3개"]
}

causes는 주목할 만한 패턴이 있는 축만 포함하세요 (1~3개). 모든 축이 양호하면 빈 배열도 괜찮습니다.`,
      },
      {
        role: "user",
        content: `다음 데이터를 교차 분석하여 원인을 추정해주세요.

${feedbackSummary}

${materialSummary}`,
      },
    ]);

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
