import { prisma } from "@/lib/db";
import { FEEDBACK_MIN_COUNT } from "@/lib/constants";

export function getPrevSemester(semester: string): string {
  const [year, term] = semester.split("-");
  if (term === "1") return `${Number(year) - 1}-2`;
  return `${year}-1`;
}

export interface FeedbackStats {
  communicationAvg: number;
  speedModerateRatio: number;
  comprehensionHighRatio: number;
  count: number;
}

export interface FeedbackCountInput {
  speed: string;
  comprehension: string;
  communication: number;
  interest?: number | null;
  assignment?: number | null;
  practice?: number | null;
}

export interface FeedbackCounts {
  total: number;
  speedCounts: { fast: number; moderate: number; slow: number };
  compCounts: { high: number; medium: number; low: number };
  commSum: number;
  interestSum: number;
  interestCount: number;
  assignmentSum: number;
  assignmentCount: number;
  practiceSum: number;
  practiceCount: number;
}

export function computeFeedbackCounts(feedbacks: FeedbackCountInput[]): FeedbackCounts {
  const speedCounts = { fast: 0, moderate: 0, slow: 0 };
  const compCounts = { high: 0, medium: 0, low: 0 };
  let commSum = 0;
  let interestSum = 0, interestCount = 0;
  let assignmentSum = 0, assignmentCount = 0;
  let practiceSum = 0, practiceCount = 0;

  for (const fb of feedbacks) {
    speedCounts[fb.speed as keyof typeof speedCounts]++;
    compCounts[fb.comprehension as keyof typeof compCounts]++;
    commSum += fb.communication;
    if (fb.interest != null) { interestSum += fb.interest; interestCount++; }
    if (fb.assignment != null) { assignmentSum += fb.assignment; assignmentCount++; }
    if (fb.practice != null) { practiceSum += fb.practice; practiceCount++; }
  }

  return {
    total: feedbacks.length,
    speedCounts, compCounts, commSum,
    interestSum, interestCount,
    assignmentSum, assignmentCount,
    practiceSum, practiceCount,
  };
}

export async function getStatsForCourses(
  courseIds: string[]
): Promise<FeedbackStats | null> {
  if (courseIds.length === 0) return null;

  const feedbacks = await prisma.feedback.findMany({
    where: { courseId: { in: courseIds } },
  });

  if (feedbacks.length < FEEDBACK_MIN_COUNT) return null;

  const { total, speedCounts, compCounts, commSum } = computeFeedbackCounts(feedbacks);
  return {
    communicationAvg: Math.round((commSum / total) * 10) / 10,
    speedModerateRatio: Math.round((speedCounts.moderate / total) * 100),
    comprehensionHighRatio: Math.round((compCounts.high / total) * 100),
    count: total,
  };
}

export async function getStatsPerCourse(
  courseIds: string[]
): Promise<Map<string, FeedbackStats>> {
  if (courseIds.length === 0) return new Map();

  const feedbacks = await prisma.feedback.findMany({
    where: { courseId: { in: courseIds } },
  });

  const grouped = new Map<string, typeof feedbacks>();
  for (const fb of feedbacks) {
    const arr = grouped.get(fb.courseId) ?? [];
    arr.push(fb);
    grouped.set(fb.courseId, arr);
  }

  const result = new Map<string, FeedbackStats>();
  for (const [courseId, fbs] of grouped) {
    if (fbs.length < FEEDBACK_MIN_COUNT) continue;
    const { total, speedCounts, compCounts, commSum } = computeFeedbackCounts(fbs);
    result.set(courseId, {
      communicationAvg: Math.round((commSum / total) * 10) / 10,
      speedModerateRatio: Math.round((speedCounts.moderate / total) * 100),
      comprehensionHighRatio: Math.round((compCounts.high / total) * 100),
      count: total,
    });
  }

  return result;
}
