"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { isDemoUser, DEMO_READ_ONLY } from "@/lib/auth-utils";

export async function saveImprovementNote(
  courseId: string,
  roundId: string | null,
  axis: string,
  changeDelta: number,
  note: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "인증 필요" };
  if (isDemoUser(session.user.email)) return DEMO_READ_ONLY;

  const course = await prisma.course.findFirst({
    where: { id: courseId, professorId: session.user.id },
    select: { category: true },
  });
  if (!course) return { success: false, error: "강의를 찾을 수 없습니다." };

  // roundId가 제공된 경우 해당 라운드가 같은 강의에 속하는지 검증
  if (roundId) {
    const round = await prisma.feedbackRound.findFirst({
      where: { id: roundId, courseId },
    });
    if (!round) return { success: false, error: "유효하지 않은 회차입니다." };
  }

  if (!note.trim()) return { success: false, error: "내용을 입력해주세요." };

  await prisma.improvementNote.create({
    data: {
      courseId,
      roundId,
      category: course.category,
      axis,
      changeDelta,
      note: note.trim(),
    },
  });

  return { success: true };
}

