"use server";

import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function generateTokens(courseId: string, count: number) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  // Verify the course belongs to the professor
  const course = await prisma.course.findUnique({
    where: { id: courseId },
  });

  if (!course || course.professorId !== session.user.id) {
    return { success: false, error: "권한이 없습니다." };
  }

  if (count < 1 || count > 200) {
    return { success: false, error: "1~200개 사이로 생성해주세요." };
  }

  const tokens = Array.from({ length: count }, () =>
    crypto.randomBytes(16).toString("hex")
  );

  await prisma.feedbackToken.createMany({
    data: tokens.map((token) => ({ token, courseId })),
  });

  return { success: true, tokens };
}

export async function getTokenStats(courseId: string) {
  const session = await auth();
  if (!session?.user?.id) return { total: 0, used: 0, unused: 0 };

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || course.professorId !== session.user.id) {
    return { total: 0, used: 0, unused: 0 };
  }

  const total = await prisma.feedbackToken.count({ where: { courseId } });
  const used = await prisma.feedbackToken.count({
    where: { courseId, used: true },
  });
  return { total, used, unused: total - used };
}

export async function getAdditionalFeedbacks(courseId: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || course.professorId !== session.user.id) return [];

  const feedbacks = await prisma.feedback.findMany({
    where: {
      courseId,
      roundId: null,
      comment: { not: null },
      OR: [
        { commentCategory: "추가" },
        { filteredComment: { not: null } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      comment: true,
      filteredComment: true,
      createdAt: true,
    },
  });

  return feedbacks.map((feedback) => ({
    id: feedback.id,
    text: feedback.filteredComment ?? feedback.comment ?? "",
    createdAt: feedback.createdAt.toISOString(),
  }));
}
