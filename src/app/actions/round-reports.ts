"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getPrevSemester, getStatsForCourses } from "@/lib/feedback-stats";

function detectChanges(
  curr: { communicationAvg: number; comprehensionHigh: number; speedModerate: number },
  prev: { communicationAvg: number; comprehensionHigh: number; speedModerate: number }
): SignificantChange[] {
  const changes: SignificantChange[] = [];
  const commDelta = Math.round((curr.communicationAvg - prev.communicationAvg) * 10) / 10;
  if (commDelta >= 0.5) changes.push({ axis: "communication", label: "소통 만족도", delta: commDelta });
  const compDelta = curr.comprehensionHigh - prev.comprehensionHigh;
  if (compDelta >= 15) changes.push({ axis: "comprehension", label: "자료 이해도", delta: compDelta });
  const speedDelta = curr.speedModerate - prev.speedModerate;
  if (speedDelta >= 15) changes.push({ axis: "speed", label: "수업 속도 적절성", delta: speedDelta });
  return changes;
}

// 작년 동일 학기 (2026-1 → 2025-1, 2026-2 → 2025-2)
function getPrevYearSameTerm(semester: string): string {
  const [year, term] = semester.split("-");
  return `${Number(year) - 1}-${term}`;
}

export interface SignificantChange {
  axis: "communication" | "comprehension" | "speed";
  label: string;
  delta: number; // 변화량 (양수 = 개선)
}

export interface RoundReport {
  id: string;
  week: number;
  label: string | null;
  endDate: string;
  totalFeedbacks: number;
  submissionCount: number;
  speedModerate: number;
  comprehensionHigh: number;
  communicationAvg: number;
  interestAvg: number;
  assignmentAvg: number | null;
  practiceAvg: number | null;
  significantChanges: SignificantChange[];
  submittedNoteAxes: string[];
}

export type SemesterComparisonType =
  | "self_same_course"   // 같은 교수, 같은 강좌명
  | "self_same_category" // 같은 교수, 같은 분야
  | "other_same_course"; // 다른 교수, 같은 강좌명 (교수 교체)

export interface SemesterComparison {
  courseId: string;
  currentSemester: string;
  prevSemester: string;
  comparisonType: SemesterComparisonType;
  comparisonLabel: string; // UI에 표시할 비교 기준 설명
  // 이번 학기 전체 통계
  curr: {
    communicationAvg: number;
    comprehensionHigh: number;
    speedModerate: number;
    totalFeedbacks: number;
  };
  // 이전 학기 전체 통계
  prev: {
    communicationAvg: number;
    comprehensionHigh: number;
    speedModerate: number;
    totalFeedbacks: number;
  };
  significantChanges: SignificantChange[];
  submittedNoteAxes: string[];
}

export interface RoundReportsResult {
  rounds: RoundReport[];
  currentSemester: string;
  semesterComparison: SemesterComparison | null; // null = 이전 학기 데이터 없음
}

// 종료된 라운드별 요약 리포트 + 학기 전체 비교
export async function getRoundReports(courseId: string): Promise<RoundReportsResult> {
  const session = await auth();
  if (!session?.user?.id) return { rounds: [], currentSemester: "", semesterComparison: null };

  const course = await prisma.course.findFirst({
    where: { id: courseId, professorId: session.user.id },
    select: { id: true, name: true, semester: true, category: true, professorId: true },
  });
  if (!course) return { rounds: [], currentSemester: "", semesterComparison: null };

  const now = new Date();

  // ─── 라운드별 리포트 ───
  const rounds = await prisma.feedbackRound.findMany({
    where: { courseId, endDate: { lte: now } },
    include: {
      feedbacks: true,
      _count: { select: { submissions: true } },
      improvementNotes: { select: { id: true, axis: true } },
    },
    orderBy: { week: "asc" },
  });

  const statsArr: RoundReport[] = rounds.map((round) => {
    const fbs = round.feedbacks;
    const total = fbs.length;

    if (total === 0) {
      return {
        id: round.id,
        week: round.week,
        label: round.label,
        endDate: round.endDate.toISOString(),
        totalFeedbacks: 0,
        submissionCount: round._count.submissions,
        speedModerate: 0,
        comprehensionHigh: 0,
        communicationAvg: 0,
        interestAvg: 0,
        assignmentAvg: null,
        practiceAvg: null,
        significantChanges: [],
        submittedNoteAxes: round.improvementNotes.map((n) => n.axis),
      };
    }

    const speedModerate = fbs.filter((f) => f.speed === "moderate").length;
    const comprehensionHigh = fbs.filter((f) => f.comprehension === "high").length;
    const communicationSum = fbs.reduce((s, f) => s + f.communication, 0);
    const interestVals = fbs.filter((f) => f.interest != null).map((f) => f.interest as number);
    const assignmentVals = fbs.filter((f) => f.assignment != null).map((f) => f.assignment as number);
    const practiceVals = fbs.filter((f) => f.practice != null).map((f) => f.practice as number);
    const avg = (arr: number[]) =>
      arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    return {
      id: round.id,
      week: round.week,
      label: round.label,
      endDate: round.endDate.toISOString(),
      totalFeedbacks: total,
      submissionCount: round._count.submissions,
      speedModerate: Math.round((speedModerate / total) * 100),
      comprehensionHigh: Math.round((comprehensionHigh / total) * 100),
      communicationAvg: Math.round((communicationSum / total) * 10) / 10,
      interestAvg: interestVals.length > 0 ? Math.round(avg(interestVals) * 10) / 10 : 0,
      assignmentAvg: assignmentVals.length > 0 ? Math.round(avg(assignmentVals) * 10) / 10 : null,
      practiceAvg: practiceVals.length > 0 ? Math.round(avg(practiceVals) * 10) / 10 : null,
      significantChanges: [],
      submittedNoteAxes: round.improvementNotes.map((n) => n.axis),
    };
  });

  // 이전 라운드 대비 변화 계산
  for (let i = 1; i < statsArr.length; i++) {
    const curr = statsArr[i];
    const prev = statsArr[i - 1];
    if (curr.totalFeedbacks === 0 || prev.totalFeedbacks === 0) continue;

    curr.significantChanges = detectChanges(curr, prev);
  }

  // ─── 학기 전체 비교 ───
  // 종료되지 않은 라운드가 있으면 아직 학기가 끝나지 않은 것으로 간주
  const hasOpenRound = await prisma.feedbackRound.count({
    where: { courseId, endDate: { gt: now } },
  });
  if (hasOpenRound > 0) {
    return { rounds: statsArr.reverse(), currentSemester: course.semester, semesterComparison: null };
  }

  const prevSemester = getPrevSemester(course.semester);

  // 비교 대상 탐색 (우선순위 순)
  const prevYearSameTerm = getPrevYearSameTerm(course.semester);
  type PrevCandidate = { ids: string[]; type: SemesterComparisonType; label: string };
  let prevCandidate: PrevCandidate | null = null;

  // 1순위: 같은 교수 + 같은 강좌명 (전 학기)
  const selfSameCourse = await prisma.course.findMany({
    where: { professorId: course.professorId, semester: prevSemester, name: course.name },
    select: { id: true },
  });
  if (selfSameCourse.length > 0) {
    prevCandidate = { ids: selfSameCourse.map((c) => c.id), type: "self_same_course", label: "전 학기 내 강의 대비" };
  }

  // 2순위: 같은 교수 + 같은 분야 (전 학기)
  if (!prevCandidate) {
    const selfSameCategory = await prisma.course.findMany({
      where: { professorId: course.professorId, semester: prevSemester, category: course.category },
      select: { id: true },
    });
    if (selfSameCategory.length > 0) {
      prevCandidate = { ids: selfSameCategory.map((c) => c.id), type: "self_same_category", label: "전 학기 동일 분야 내 강의 대비" };
    }
  }

  // 3순위: 전년 동일 학기 + 같은 강좌명 (교수 무관 — 교수 교체 포함)
  if (!prevCandidate) {
    const prevYearSameCourse = await prisma.course.findMany({
      where: { semester: prevYearSameTerm, name: course.name },
      select: { id: true },
    });
    if (prevYearSameCourse.length > 0) {
      prevCandidate = { ids: prevYearSameCourse.map((c) => c.id), type: "other_same_course", label: "전년 동일 강좌 대비" };
    }
  }

  let semesterComparison: SemesterComparison | null = null;

  if (prevCandidate) {
    const [currStats, prevStats] = await Promise.all([
      getStatsForCourses([courseId]),
      getStatsForCourses(prevCandidate.ids),
    ]);

    if (currStats && prevStats) {
      // 학기 레벨 노트: roundId = null인 것
      const semesterNotes = await prisma.improvementNote.findMany({
        where: { courseId, roundId: null },
        select: { axis: true },
      });

      const semChanges = detectChanges(
        { communicationAvg: currStats.communicationAvg, comprehensionHigh: currStats.comprehensionHighRatio, speedModerate: currStats.speedModerateRatio },
        { communicationAvg: prevStats.communicationAvg, comprehensionHigh: prevStats.comprehensionHighRatio, speedModerate: prevStats.speedModerateRatio }
      );

      semesterComparison = {
        courseId,
        currentSemester: course.semester,
        prevSemester,
        comparisonType: prevCandidate.type,
        comparisonLabel: prevCandidate.label,
        curr: {
          communicationAvg: currStats.communicationAvg,
          comprehensionHigh: currStats.comprehensionHighRatio,
          speedModerate: currStats.speedModerateRatio,
          totalFeedbacks: currStats.count,
        },
        prev: {
          communicationAvg: prevStats.communicationAvg,
          comprehensionHigh: prevStats.comprehensionHighRatio,
          speedModerate: prevStats.speedModerateRatio,
          totalFeedbacks: prevStats.count,
        },
        significantChanges: semChanges,
        submittedNoteAxes: semesterNotes.map((n) => n.axis),
      };
    }
  }

  return {
    rounds: statsArr.reverse(),
    currentSemester: course.semester,
    semesterComparison,
  };
}
