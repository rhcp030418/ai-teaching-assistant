"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  getPrevSemester,
  getStatsForCourses,
  getStatsPerCourse,
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

  // 레이더 차트용 유사 분야 상세 평균
  let categoryRadarAxes: { label: string; value: number }[] | null = null;
  if (categoryIds.length > 0) {
    const catFbs = await prisma.feedback.findMany({
      where: { courseId: { in: categoryIds } },
      select: { speed: true, comprehension: true, communication: true, interest: true, assignment: true, practice: true },
    });
    if (catFbs.length > 0) {
      const total = catFbs.length;
      const avg = (vals: number[]) => vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      const interestVals = catFbs.filter((f) => f.interest != null).map((f) => f.interest as number);
      categoryRadarAxes = [
        { label: "속도 적절성", value: (catFbs.filter((f) => f.speed === "moderate").length / total) * 100 },
        { label: "자료 이해도", value: (catFbs.filter((f) => f.comprehension === "high").length / total) * 100 },
        { label: "소통 만족도", value: (catFbs.reduce((s, f) => s + f.communication, 0) / total / 5) * 100 },
        { label: "강의 흥미도", value: interestVals.length > 0 ? (avg(interestVals) / 5) * 100 : 0 },
      ];
      // 현재 강의 설정과 동일한 선택 축만 추가
      if (course.hasAssignment) {
        const vals = catFbs.filter((f) => f.assignment != null).map((f) => f.assignment as number);
        if (vals.length > 0) categoryRadarAxes.push({ label: "과제 적절성", value: (avg(vals) / 5) * 100 });
      }
      if (course.hasPractice) {
        const vals = catFbs.filter((f) => f.practice != null).map((f) => f.practice as number);
        if (vals.length > 0) categoryRadarAxes.push({ label: "실습/예시", value: (avg(vals) / 5) * 100 });
      }
    }
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
    categoryName: course.category,
    semester: course.semester,
    prevSemester,
    categoryCourseCount: categoryCourses.length,
    percentileRank,
    categoryRadarAxes,
  };
}
