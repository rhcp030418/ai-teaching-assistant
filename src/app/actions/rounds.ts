"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getRoundStatus } from "@/lib/round-utils";

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
    },
    orderBy: { week: "asc" },
  });

  return rounds.map((r) => ({
    id: r.id,
    week: r.week,
    label: r.label,
    startDate: r.startDate.toISOString(),
    endDate: r.endDate.toISOString(),
    status: getRoundStatus(r),
    feedbackCount: r._count.feedbacks,
    submissionCount: r._count.submissions,
  }));
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

  const course = await prisma.course.findFirst({
    where: { id: courseId, professorId: session.user.id },
  });
  if (!course) return { success: false, error: "권한 없음" };

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { success: false, error: "날짜 형식이 잘못되었습니다." };
  }
  if (end <= start) {
    return { success: false, error: "종료일은 시작일보다 뒤여야 합니다." };
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

export async function deleteRound(roundId: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "인증 필요" };

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
