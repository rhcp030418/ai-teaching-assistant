"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { chatWithAI } from "@/lib/ai";
import { parseAIJson } from "@/lib/parse-ai-json";

export interface TrendNarrative {
  narrative: string;        // 2~3문장 한국어 분석
  trend: "improving" | "worsening" | "stable" | "mixed";
  predicted: {
    comprehension: number;  // 다음 주차 예측 이해도 % (0~100)
    communication: number;  // 다음 주차 예측 소통점수 (0~100, *20 정규화)
    speed: number;          // 다음 주차 예측 속도적절 % (0~100)
  } | null;
}

export async function generateTrendNarrative(
  courseId: string,
  rounds: {
    week: number;
    label: string | null;
    communicationAvg: number;
    comprehensionHigh: number;
    speedModerate: number;
    totalFeedbacks: number;
  }[]
): Promise<{ success: boolean; result?: TrendNarrative; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "인증 필요" };

  // 소유권 검증
  const course = await prisma.course.findFirst({
    where: { id: courseId, professorId: session.user.id },
    select: { name: true },
  });
  if (!course) return { success: false, error: "강의를 찾을 수 없습니다." };

  // 데이터가 충분한 라운드만 (응답 1건 이상)
  const validRounds = rounds.filter((r) => r.totalFeedbacks > 0);
  if (validRounds.length < 2) {
    return { success: false, error: "트렌드 분석을 위해 응답이 있는 라운드가 2개 이상 필요합니다." };
  }

  const roundsSummary = validRounds
    .map((r) => {
      const weekLabel = r.label ?? `${r.week}주차`;
      return `- ${weekLabel}: 이해도 ${r.comprehensionHigh}%, 소통 ${r.communicationAvg}/5, 속도적절 ${r.speedModerate}%, 응답수 ${r.totalFeedbacks}건`;
    })
    .join("\n");

  const canPredict = validRounds.length >= 3;

  try {
    const response = await chatWithAI([
      {
        role: "system",
        content: `당신은 대학 강의 데이터 분석 전문가입니다. 주차별 피드백 트렌드를 보고 교수에게 간결하고 실용적인 인사이트를 제공합니다.
마크다운 문법(**, *, -, #, \`\`\` 등) 절대 사용 금지. 모든 텍스트 필드는 자연스러운 한국어 문장으로만 작성하세요.

반드시 다음 JSON 형식으로만 응답하세요:
{
  "narrative": "트렌드 분석 및 조언을 2~3문장으로. 구체적인 수치를 포함하고, 눈에 띄는 변화나 주의할 점을 짚어주세요. 문어체 사용.",
  "trend": "improving | worsening | stable | mixed",
  "predicted": ${canPredict ? `{
    "comprehension": 다음 주차 예측 이해도% (정수),
    "communication": 다음 주차 예측 소통점수를 0~100으로 정규화 (소통점수/5*100, 정수),
    "speed": 다음 주차 예측 속도적절% (정수)
  }` : "null"}
}

trend 판단 기준:
- improving: 주요 지표 대부분 상승
- worsening: 주요 지표 대부분 하락
- stable: 큰 변화 없음 (±5% 이내)
- mixed: 일부 상승, 일부 하락${canPredict ? "\n\n예측은 간단한 선형 추세로 추정하되, 합리적 범위(0~100)를 벗어나지 않게 하세요." : ""}`,
      },
      {
        role: "user",
        content: `강의명: ${course.name}\n\n주차별 피드백 통계:\n${roundsSummary}`,
      },
    ]);

    let result: TrendNarrative;
    try {
      result = parseAIJson<TrendNarrative>(response.content);
    } catch {
      return { success: false, error: "AI 응답 파싱 실패" };
    }

    return { success: true, result };
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI 분석 실패";
    return { success: false, error: message };
  }
}
