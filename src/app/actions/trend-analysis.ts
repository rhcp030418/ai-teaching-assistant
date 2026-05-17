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

  // 변화량 및 가속도 사전 계산
  const first = validRounds[0];
  const prev = validRounds[validRounds.length - 2];
  const last = validRounds[validRounds.length - 1];
  const compDelta = last.comprehensionHigh - first.comprehensionHigh;
  const commDelta = Math.round((last.communicationAvg - first.communicationAvg) * 10) / 10;
  const speedDelta = last.speedModerate - first.speedModerate;

  // 최근 1구간 변화 (가속도 감지용)
  const recentCompDelta = last.comprehensionHigh - prev.comprehensionHigh;
  const recentCommDelta = Math.round((last.communicationAvg - prev.communicationAvg) * 10) / 10;

  // 어느 구간에서 가장 큰 변화가 있었는지
  let biggestChangeNote = "";
  if (validRounds.length >= 3) {
    let maxChange = 0;
    let maxIdx = 1;
    for (let i = 1; i < validRounds.length; i++) {
      const change = Math.abs(validRounds[i].comprehensionHigh - validRounds[i - 1].comprehensionHigh)
        + Math.abs(validRounds[i].communicationAvg - validRounds[i - 1].communicationAvg) * 10;
      if (change > maxChange) { maxChange = change; maxIdx = i; }
    }
    const from = validRounds[maxIdx - 1].label ?? `${validRounds[maxIdx - 1].week}주차`;
    const to = validRounds[maxIdx].label ?? `${validRounds[maxIdx].week}주차`;
    biggestChangeNote = `\n가장 큰 변화 구간: ${from} → ${to}`;
  }

  const deltaLines = [
    `전체 기간 변화 (${first.label ?? first.week + "주차"} → ${last.label ?? last.week + "주차"}):`,
    `- 이해도 높음: ${first.comprehensionHigh}% → ${last.comprehensionHigh}% (${compDelta >= 0 ? "+" : ""}${compDelta}%p)`,
    `- 소통 만족도: ${first.communicationAvg}/5 → ${last.communicationAvg}/5 (${commDelta >= 0 ? "+" : ""}${commDelta})`,
    `- 속도 적절: ${first.speedModerate}% → ${last.speedModerate}% (${speedDelta >= 0 ? "+" : ""}${speedDelta}%p)`,
    validRounds.length >= 3
      ? `\n최근 1구간 변화 (직전 → 마지막): 이해도 ${recentCompDelta >= 0 ? "+" : ""}${recentCompDelta}%p, 소통 ${recentCommDelta >= 0 ? "+" : ""}${recentCommDelta}`
      : "",
    biggestChangeNote,
  ].filter(Boolean).join("\n");

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
        content: `당신은 대학 강의 데이터 분석 전문가입니다. 주차별 피드백 트렌드를 보고 교수에게 실용적인 인사이트를 제공합니다.
마크다운 문법(**, *, -, #, \`\`\` 등) 절대 사용 금지. 모든 텍스트 필드는 자연스러운 한국어 문장으로만 작성하세요.

반드시 다음 JSON 형식으로만 응답하세요:
{
  "narrative": "제공된 변화량 수치를 반드시 활용하여 3문장으로 작성하세요. 1) 가장 두드러진 변화를 구간과 수치 포함하여 서술 (예: '3주차에서 4주차 사이 이해도가 45%에서 62%로 17%p 상승하였습니다'), 2) 최근 1구간 추세가 가속/둔화 중인지 판단 (예: '그러나 최근 한 주간 상승세가 둔화되고 있어'), 3) 다음 주차를 위한 구체적 제언 1가지. 문어체 사용.",
  "trend": "improving | worsening | stable | mixed",
  "predicted": ${canPredict ? `{
    "comprehension": 다음 주차 예측 이해도% (정수, 0~100),
    "communication": 다음 주차 예측 소통점수를 0~100으로 정규화 (소통점수/5*100, 정수),
    "speed": 다음 주차 예측 속도적절% (정수, 0~100)
  }` : "null"}
}

trend 판단 기준:
- improving: 이해도·소통 모두 상승
- worsening: 이해도·소통 모두 하락
- stable: 모든 지표 ±5%p 이내
- mixed: 지표별로 방향이 다름${canPredict ? "\n\n예측은 최근 2회차 추세(가속도 반영)를 기반으로 추정하되, 0~100 범위를 벗어나지 마세요." : ""}`,
      },
      {
        role: "user",
        content: `강의명: ${course.name}\n\n${deltaLines}\n\n주차별 상세:\n${roundsSummary}`,
      },
    ], { temperature: 0.2 });

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
