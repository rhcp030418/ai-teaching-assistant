"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getRoundStatus } from "@/lib/round-utils";
import { comprehensionScore } from "@/lib/feedback-stats";
import { isDemoUser, DEMO_READ_ONLY } from "@/lib/auth-utils";

type RoundStatusForUi = "pending" | "active" | "closed" | "overlap";

function buildDisplayComment(feedback: {
  filteredComment: string | null;
  comment: string | null;
  positiveComment: string | null;
  difficultyComment: string | null;
}) {
  if (feedback.filteredComment?.trim()) return feedback.filteredComment;
  if (feedback.comment?.trim()) return feedback.comment;

  const parts: string[] = [];
  if (feedback.positiveComment?.trim()) parts.push(`좋았던 점: ${feedback.positiveComment}`);
  if (feedback.difficultyComment?.trim()) parts.push(`아쉬웠던 점: ${feedback.difficultyComment}`);
  return parts.join("\n\n") || null;
}

export async function getRounds(courseId: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

  const course = await prisma.course.findFirst({
    where: { id: courseId, professorId: session.user.id },
  });
  if (!course) return [];

  const rounds = await prisma.feedbackRound.findMany({
    where: { courseId },
    include: {
      _count: { select: { feedbacks: true, submissions: true } },
      feedbacks: {
        orderBy: { createdAt: "desc" },
        select: {
          speed: true,
          comprehension: true,
          communication: true,
          materialHelp: true,
          interest: true,
          assignment: true,
          practice: true,
          positiveComment: true,
          difficultyComment: true,
          comment: true,
          filteredComment: true,
          createdAt: true,
        },
      },
    },
    orderBy: { week: "asc" },
  });

  const now = new Date();
  const activeRoundIds = rounds
    .filter((round) => getRoundStatus(round, now) === "active")
    .sort((a, b) => {
      const startDiff = b.startDate.getTime() - a.startDate.getTime();
      return startDiff !== 0 ? startDiff : b.week - a.week;
    })
    .map((round) => round.id);
  const primaryActiveRoundId = activeRoundIds[0] ?? null;
  const overlappingActiveIds = new Set(activeRoundIds.slice(1));

  return rounds.map((r) => {
    const status: RoundStatusForUi = overlappingActiveIds.has(r.id)
      ? "overlap"
      : primaryActiveRoundId === r.id
        ? "active"
        : getRoundStatus(r, now);

    const totalFeedbacks = r.feedbacks.length;
    const speedModerate = totalFeedbacks > 0
      ? Math.round((r.feedbacks.filter((fb) => fb.speed === "moderate").length / totalFeedbacks) * 100)
      : 0;
    const comprehensionHigh = totalFeedbacks > 0
      ? Math.round((r.feedbacks.filter((fb) => comprehensionScore(fb.comprehension) >= 4).length / totalFeedbacks) * 100)
      : 0;
    const communicationAvg = totalFeedbacks > 0
      ? Math.round((r.feedbacks.reduce((sum, fb) => sum + fb.communication, 0) / totalFeedbacks) * 10) / 10
      : 0;
    const comments = r.feedbacks
      .map((fb) => {
        const text = buildDisplayComment(fb);
        if (!text?.trim()) return null;
        return {
          text,
          createdAt: fb.createdAt.toISOString(),
        };
      })
      .filter((item): item is { text: string; createdAt: string } => item !== null);

    return {
      id: r.id,
      week: r.week,
      label: r.label,
      startDate: r.startDate.toISOString(),
      endDate: r.endDate.toISOString(),
      status,
      feedbackCount: r._count.feedbacks,
      submissionCount: r._count.submissions,
      summary: {
        speedModerate,
        comprehensionHigh,
        communicationAvg,
      },
      comments,
    };
  });
}

async function hasOverlappingRound(
  courseId: string,
  start: Date,
  end: Date,
  excludeRoundId?: string,
) {
  const overlap = await prisma.feedbackRound.findFirst({
    where: {
      courseId,
      ...(excludeRoundId ? { id: { not: excludeRoundId } } : {}),
      startDate: { lt: end },
      endDate: { gt: start },
    },
    select: { week: true, label: true },
  });

  return overlap;
}

export async function createRound(
  courseId: string,
  week: number,
  startDate: string,
  endDate: string,
  label?: string
) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "인증 필요" };
  if (isDemoUser(session.user.email)) return DEMO_READ_ONLY;

  const course = await prisma.course.findFirst({
    where: { id: courseId, professorId: session.user.id },
  });
  if (!course) return { success: false, error: "권한 없음" };

  if (!Number.isInteger(week) || week < 1 || week > 52) {
    return { success: false, error: "주차는 1~52 사이의 정수여야 합니다." };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { success: false, error: "날짜 형식이 잘못되었습니다." };
  }
  if (end <= start) {
    return { success: false, error: "종료일은 시작일보다 뒤여야 합니다." };
  }

  const overlap = await hasOverlappingRound(courseId, start, end);
  if (overlap) {
    return {
      success: false,
      error: `${overlap.label ?? `${overlap.week}주차`}와 기간이 겹칩니다. 평가 기간은 서로 겹치지 않게 설정해주세요.`,
    };
  }

  const existing = await prisma.feedbackRound.findUnique({
    where: { courseId_week: { courseId, week } },
  });
  if (existing) return { success: false, error: `${week}주차가 이미 존재합니다.` };

  await prisma.feedbackRound.create({
    data: { courseId, week, label: label || `${week}주차`, startDate: start, endDate: end },
  });

  return { success: true };
}

export async function updateRoundPeriod(
  roundId: string,
  startDate: string,
  endDate: string,
) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "인증 필요" };
  if (isDemoUser(session.user.email)) return DEMO_READ_ONLY;

  const round = await prisma.feedbackRound.findUnique({
    where: { id: roundId },
    include: { course: true },
  });
  if (!round || round.course.professorId !== session.user.id) {
    return { success: false, error: "권한 없음" };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { success: false, error: "날짜 형식이 잘못되었습니다." };
  }
  if (end <= start) {
    return { success: false, error: "종료일은 시작일보다 뒤여야 합니다." };
  }

  const overlap = await hasOverlappingRound(round.courseId, start, end, roundId);
  if (overlap) {
    return {
      success: false,
      error: `${overlap.label ?? `${overlap.week}주차`}와 기간이 겹칩니다. 평가 기간은 서로 겹치지 않게 설정해주세요.`,
    };
  }

  await prisma.feedbackRound.update({
    where: { id: roundId },
    data: { startDate: start, endDate: end },
  });

  return { success: true };
}

export async function deleteRound(roundId: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "인증 필요" };
  if (isDemoUser(session.user.email)) return DEMO_READ_ONLY;

  const round = await prisma.feedbackRound.findUnique({
    where: { id: roundId },
    include: { course: true, _count: { select: { feedbacks: true } } },
  });
  if (!round || round.course.professorId !== session.user.id) {
    return { success: false, error: "권한 없음" };
  }

  if (round._count.feedbacks > 0) {
    return { success: false, error: "피드백이 있는 라운드는 삭제할 수 없습니다." };
  }

  await prisma.feedbackRound.delete({ where: { id: roundId } });
  return { success: true };
}
