"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  getPrevSemester,
  getStatsForCourses,
  getStatsPerCourse,
  scoreToRatio,
} from "@/lib/feedback-stats";

export interface BenchmarkData {
  myCommunicationAvg: number;
  categoryCommunicationAvg: number | null;
  semesterCommunicationAvg: number | null;
  prevSemesterCommunicationAvg: number | null;
  mySpeedModerateRatio: number;
  categorySpeedModerateRatio: number | null;
  myComprehensionHighRatio: number;
  categoryComprehensionHighRatio: number | null;
  myMaterialHelpRatio: number;
  categoryMaterialHelpRatio: number | null;
  categoryName: string;
  semester: string;
  prevSemester: string;
  categoryCourseCount: number;
  percentileRank: number | null;
  // 레이더 차트용 유사 분야 평균 (my radarAxes와 동일 순서/개수)
  categoryRadarAxes: { label: string; value: number }[] | null;
}

export async function getBenchmark(
  courseId: string
): Promise<BenchmarkData | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const course = await prisma.course.findUnique({
    where: { id: courseId, professorId: session.user.id },
    select: {
      id: true,
      category: true,
      semester: true,
      hasAssignment: true,
      hasPractice: true,
      _count: { select: { feedbacks: true } },
    },
  });

  if (!course || course._count.feedbacks === 0) return null;

  const myStats = await getStatsForCourses([courseId]);
  if (!myStats) return null;

  // Same category, same semester (excluding this course)
  const categoryCourses = await prisma.course.findMany({
    where: {
      category: course.category,
      semester: course.semester,
      id: { not: courseId },
    },
    select: { id: true },
  });
  const categoryIds = categoryCourses.map((c) => c.id);
  const categoryStats = await getStatsForCourses(categoryIds);

  const avgToRatio = (avg: number) => scoreToRatio(avg, 1);

  // 레이더 차트용 유사 분야 평균 — overview의 고정 4축과 동일한 순서
  let categoryRadarAxes: { label: string; value: number }[] | null = null;
  if (categoryStats) {
    categoryRadarAxes = [
      { label: "내용 이해", value: avgToRatio(categoryStats.comprehensionAvg) },
      { label: "자료·예시 도움", value: avgToRatio(categoryStats.materialHelpAvg) },
      { label: "질문·소통 편의", value: avgToRatio(categoryStats.communicationAvg) },
      { label: "학습 몰입", value: avgToRatio(categoryStats.engagementAvg) },
    ];
  }

  // All courses, same semester (excluding this course)
  const semesterCourses = await prisma.course.findMany({
    where: { semester: course.semester, id: { not: courseId } },
    select: { id: true },
  });
  const semesterStats = await getStatsForCourses(
    semesterCourses.map((c) => c.id)
  );

  // Previous semester, same category
  const prevSemester = getPrevSemester(course.semester);
  const prevCourses = await prisma.course.findMany({
    where: { category: course.category, semester: prevSemester },
    select: { id: true },
  });
  const prevStats = await getStatsForCourses(prevCourses.map((c) => c.id));

  // Percentile rank — single batch query instead of N+1
  let percentileRank: number | null = null;
  if (categoryIds.length > 0) {
    const allIds = [courseId, ...categoryIds];
    const statsMap = await getStatsPerCourse(allIds);

    const courseAvgs = Array.from(statsMap.entries())
      .map(([id, s]) => ({ id, avg: s.communicationAvg }))
      .sort((a, b) => b.avg - a.avg);

    const myRank = courseAvgs.findIndex((c) => c.id === courseId) + 1;
    if (myRank > 0 && courseAvgs.length > 1) {
      percentileRank = Math.round((myRank / courseAvgs.length) * 100);
    }
  }

  return {
    myCommunicationAvg: myStats.communicationAvg,
    categoryCommunicationAvg: categoryStats?.communicationAvg ?? null,
    semesterCommunicationAvg: semesterStats?.communicationAvg ?? null,
    prevSemesterCommunicationAvg: prevStats?.communicationAvg ?? null,
    mySpeedModerateRatio: myStats.speedModerateRatio,
    categorySpeedModerateRatio: categoryStats?.speedModerateRatio ?? null,
    myComprehensionHighRatio: myStats.comprehensionHighRatio,
    categoryComprehensionHighRatio:
      categoryStats?.comprehensionHighRatio ?? null,
    myMaterialHelpRatio: avgToRatio(myStats.materialHelpAvg),
    categoryMaterialHelpRatio: categoryStats ? avgToRatio(categoryStats.materialHelpAvg) : null,
    categoryName: course.category,
    semester: course.semester,
    prevSemester,
    categoryCourseCount: categoryCourses.length,
    percentileRank,
    categoryRadarAxes,
  };
}
