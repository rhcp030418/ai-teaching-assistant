"use server";

import { after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { chatWithAI } from "@/lib/ai";
import { isDemoUser, DEMO_READ_ONLY } from "@/lib/auth-utils";

// 실제 AI 호출 + DB 저장 (내부 전용)
async function computeAndSave(courseId: string): Promise<string | null> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { feedbacks: true },
  });
  if (!course || course.feedbacks.length < 3) return null;

  const feedbacks = course.feedbacks;
  const total = feedbacks.length;
  const speedModerate = feedbacks.filter((f) => f.speed === "moderate").length;
  const comprehensionHigh = feedbacks.filter((f) => f.comprehension === "high").length;
  const communicationSum = feedbacks.reduce((s, f) => s + f.communication, 0);
  const interestFbs = feedbacks.filter((f) => f.interest != null);
  const interestAvg =
    interestFbs.length > 0
      ? interestFbs.reduce((s, f) => s + f.interest!, 0) / interestFbs.length
      : null;

  const topComments = feedbacks
    .map((f) => (f as { filteredComment?: string | null; comment?: string | null }).filteredComment ?? (f as { comment?: string | null }).comment)
    .filter((c): c is string => !!c && c.trim().length > 0)
    .slice(0, 10);

  const statsLines = [
    `강의명: ${course.name}`,
    `- 총 응답: ${total}건`,
    `- 속도 적절 비율: ${Math.round((speedModerate / total) * 100)}%`,
    `- 자료 이해도 높음: ${Math.round((comprehensionHigh / total) * 100)}%`,
    `- 소통 만족도 평균: ${Math.round((communicationSum / total) * 10) / 10}/5`,
    interestAvg !== null
      ? `- 강의 흥미도 평균: ${Math.round(interestAvg * 10) / 10}/5`
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
          "당신은 대학 강의 평가 분석가입니다. 강의 피드백 통계와 학생 의견을 보고 두 문장으로 요약해주세요. 첫 문장은 수치를 포함한 이 강의의 가장 뚜렷한 강점 (예: '소통 만족도 4.2/5로 학생들과의 소통이 이 강의의 핵심 강점입니다'), 두 번째 문장은 가장 주목해야 할 개선 포인트와 방향 힌트 (예: '다만 이해도 높음이 38%로 낮아, 설명 방식에 보완이 필요해 보입니다'). 학생 의견에서 반복되는 패턴이 있으면 반영하세요. 마크다운 문법(**, *, -, # 등) 절대 사용 금지. JSON 없이 순수 텍스트만 반환하세요.",
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
  if (isDemoUser(session.user.email)) return DEMO_READ_ONLY;

  const course = await prisma.course.findUnique({
    where: { id: courseId, professorId: session.user.id },
    select: { aiSummary: true, _count: { select: { feedbacks: true } } },
  });
  if (!course) return { success: false, error: "강의를 찾을 수 없습니다." };

  // 캐시 히트
  if (course.aiSummary) {
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
  if (!hasClosedRounds || cachedSummary) return;

  // 소유권 검증: 본인 강의에 대해서만 백그라운드 생성 허용
  const session = await auth();
  if (!session?.user?.id) return;
  if (isDemoUser(session.user.email)) return;
  const owned = await prisma.course.findUnique({
    where: { id: courseId, professorId: session.user.id },
    select: { id: true },
  });
  if (!owned) return;

  after(async () => {
    await computeAndSave(courseId);
  });
}
