import { cache } from "react";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { isDemoUser, isDemoVisibleCourse } from "@/lib/auth-utils";

/**
 * 강의 상세 라우트 공통 접근 헬퍼.
 * - 세션 확인(auth)
 * - 소유권 확인(professorId 일치)
 * - 데모 계정 노출 과목 제한
 * 위 조건을 통과하지 못하면 notFound()로 종료한다.
 *
 * React cache()로 감싸 같은 요청 안에서 layout/page가 함께 호출해도
 * 단일 쿼리로 dedupe 된다. include 형태는 현황 요약(page.tsx)이 필요로 하는
 * 것과 동일하게 맞춰, 오버뷰가 이 헬퍼 결과를 그대로 재사용할 수 있도록 한다.
 */
export const getOwnedCourse = cache(async (courseId: string) => {
  const session = await auth();
  if (!session?.user?.id) notFound();

  const course = await prisma.course.findUnique({
    where: { id: courseId, professorId: session.user.id },
    include: {
      professor: { select: { name: true, email: true } },
      feedbacks: { orderBy: { createdAt: "desc" } },
      feedbackRounds: {
        select: { id: true, week: true, label: true, startDate: true, endDate: true },
      },
    },
  });

  if (!course) notFound();

  // 데모 계정은 노출 과목 외 직접 링크 접근 차단
  if (isDemoUser(session.user.email) && !isDemoVisibleCourse(course.name)) {
    notFound();
  }

  return course;
});
