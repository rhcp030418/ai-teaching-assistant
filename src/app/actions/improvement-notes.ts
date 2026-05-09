"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function saveImprovementNote(
  courseId: string,
  roundId: string | null,
  axis: string,
  changeDelta: number,
  note: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "인증 필요" };

  const course = await prisma.course.findFirst({
    where: { id: courseId, professorId: session.user.id },
    select: { category: true },
  });
  if (!course) return { success: false, error: "강의를 찾을 수 없습니다." };

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

