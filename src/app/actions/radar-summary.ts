"use server";

import { after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { chatWithAI } from "@/lib/ai";
import { computeFeedbackCounts, scoreToRatio } from "@/lib/feedback-stats";

function isLegacySummary(summary: string) {
  return (
    summary.includes("자료 이해도") ||
    summary.includes("강의 흥미도") ||
    summary.includes("이해도 높음")
  );
}

// 실제 AI 호출 + DB 저장 (내부 전용)
async function computeAndSave(courseId: string): Promise<string | null> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { feedbacks: true },
  });
  if (!course || course.feedbacks.length < 3) return null;

  const feedbacks = course.feedbacks;
  const {
    total,
    speedCounts,
    comprehensionSum,
    comprehensionCount,
    materialHelpSum,
    materialHelpCount,
    commSum,
    interestSum,
    interestCount,
  } = computeFeedbackCounts(feedbacks);

  const contentRatio = Math.round(scoreToRatio(comprehensionSum, comprehensionCount));
  const materialRatio = Math.round(scoreToRatio(materialHelpSum, materialHelpCount));
  const communicationAvg = Math.round((commSum / total) * 10) / 10;
  const engagementAvg =
    interestCount > 0 ? Math.round((interestSum / interestCount) * 10) / 10 : null;
  const speedModerateRatio = Math.round((speedCounts.moderate / total) * 100);
  const speedFastRatio = Math.round(((speedCounts.fast + speedCounts.veryFast) / total) * 100);
  const speedSlowRatio = Math.round(((speedCounts.slow + speedCounts.verySlow) / total) * 100);

  const topComments = feedbacks
    .map((f) => (f as { filteredComment?: string | null; comment?: string | null }).filteredComment ?? (f as { comment?: string | null }).comment)
    .filter((c): c is string => !!c && c.trim().length > 0)
    .slice(0, 10);

  const statsLines = [
    `강의명: ${course.name}`,
    `- 총 응답: ${total}건`,
    `- 수업 속도 분포: 빠름 ${speedFastRatio}% / 적당 ${speedModerateRatio}% / 느림 ${speedSlowRatio}%`,
    `- 내용 이해: ${contentRatio}%`,
    materialHelpCount > 0 ? `- 자료·예시 도움: ${materialRatio}%` : null,
    `- 질문·소통 편의: ${communicationAvg}/5`,
    engagementAvg !== null
      ? `- 학습 몰입: ${engagementAvg}/5`
      : null,
    topComments.length > 0
      ? `- 학생 의견 (일부): ${topComments.join(" / ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await chatWithAI([
      {
        role: "system",
        content:
          "당신은 대학 강의 피드백을 정리하는 분석 도구입니다. 강의 피드백 통계와 학생 의견을 보고 두 문장으로 요약해주세요. 첫 문장은 수치를 포함한 이 강의의 가장 뚜렷한 학생 반응을 적습니다. 두 번째 문장은 교수님이 참고할 수 있는 대응 방향을 완곡하게 제시합니다. 지표명은 내용 이해, 자료·예시 도움, 질문·소통 편의, 학습 몰입, 수업 속도만 사용하세요. '평가', '문제', '지시'처럼 단정적인 표현은 피하고 학생 반응을 정리하는 톤을 유지하세요. 마크다운 문법(**, *, -, # 등) 절대 사용 금지. JSON 없이 순수 텍스트만 반환하세요.",
      },
      {
        role: "user",
        content: `다음 강의 피드백을 요약해주세요:\n\n${statsLines}`,
      },
    ], { temperature: 0.4 });
    const summary = response.content.trim().replace(/^["']|["']$/g, "");

    // DB에 캐시 저장
    await prisma.course.update({
      where: { id: courseId },
      data: { aiSummary: summary },
    });

    return summary;
  } catch {
    return null;
  }
}

// 클라이언트에서 호출: 캐시 있으면 즉시 반환, 없으면 AI 호출 후 저장
export async function generateRadarSummary(
  courseId: string
): Promise<{ success: boolean; summary?: string; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "인증 필요" };
  const course = await prisma.course.findUnique({
    where: { id: courseId, professorId: session.user.id },
    select: { aiSummary: true, _count: { select: { feedbacks: true } } },
  });
  if (!course) return { success: false, error: "강의를 찾을 수 없습니다." };

  // 캐시 히트
  if (course.aiSummary && !isLegacySummary(course.aiSummary)) {
    return { success: true, summary: course.aiSummary };
  }

  if (course._count.feedbacks < 3) return { success: false, error: "데이터 부족" };

  const summary = await computeAndSave(courseId);
  if (!summary) return { success: false, error: "AI 요약 생성 실패" };
  return { success: true, summary };
}

// page.tsx 서버 컴포넌트에서 호출: 종료된 라운드가 있는데 캐시가 없으면
// 응답 후 백그라운드에서 자동 생성
export async function triggerSummaryIfNeeded(
  courseId: string,
  hasClosedRounds: boolean,
  cachedSummary: string | null
) {
  if (!hasClosedRounds || (cachedSummary && !isLegacySummary(cachedSummary))) return;

  // 소유권 검증: 본인 강의에 대해서만 백그라운드 생성 허용
  const session = await auth();
  if (!session?.user?.id) return;
  const owned = await prisma.course.findUnique({
    where: { id: courseId, professorId: session.user.id },
    select: { id: true },
  });
  if (!owned) return;

  after(async () => {
    await computeAndSave(courseId);
  });
}
