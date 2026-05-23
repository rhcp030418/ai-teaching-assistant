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
  comprehensionAvg: number;
  materialHelpAvg: number;
  engagementAvg: number;
  count: number;
}

export interface FeedbackCountInput {
  speed: string;
  comprehension: string;
  materialHelp?: number | null;
  communication?: number;
  interest?: number | null;
  assignment?: number | null;
  practice?: number | null;
}

export interface FeedbackCounts {
  total: number;
  speedCounts: { verySlow: number; slow: number; moderate: number; fast: number; veryFast: number };
  compCounts: { high: number; medium: number; low: number };
  comprehensionSum: number;
  comprehensionCount: number;
  materialHelpSum: number;
  materialHelpCount: number;
  commSum: number;
  interestSum: number;
  interestCount: number;
  assignmentSum: number;
  assignmentCount: number;
  practiceSum: number;
  practiceCount: number;
}

export function comprehensionScore(value: string): number {
  if (value === "high") return 5;
  if (value === "medium") return 3;
  if (value === "low") return 1;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(1, Math.min(5, numeric)) : 0;
}

export function scoreToRatio(score: number, count: number) {
  return count > 0 ? (score / count / 5) * 100 : 0;
}

function speedKey(value: string): keyof FeedbackCounts["speedCounts"] {
  if (value === "very_slow") return "verySlow";
  if (value === "very_fast") return "veryFast";
  if (value === "fast") return "fast";
  if (value === "slow") return "slow";
  return "moderate";
}

export function computeFeedbackCounts(feedbacks: FeedbackCountInput[]): FeedbackCounts {
  const speedCounts = { verySlow: 0, slow: 0, moderate: 0, fast: 0, veryFast: 0 };
  const compCounts = { high: 0, medium: 0, low: 0 };
  let comprehensionSum = 0, comprehensionCount = 0;
  let materialHelpSum = 0, materialHelpCount = 0;
  let commSum = 0;
  let interestSum = 0, interestCount = 0;
  let assignmentSum = 0, assignmentCount = 0;
  let practiceSum = 0, practiceCount = 0;

  for (const fb of feedbacks) {
    speedCounts[speedKey(fb.speed)]++;
    const compScore = comprehensionScore(fb.comprehension);
    if (compScore > 0) {
      comprehensionSum += compScore;
      comprehensionCount++;
      if (compScore >= 4) compCounts.high++;
      else if (compScore >= 3) compCounts.medium++;
      else compCounts.low++;
    }
    commSum += fb.communication ?? 0;
    if (fb.materialHelp != null) { materialHelpSum += fb.materialHelp; materialHelpCount++; }
    if (fb.interest != null) { interestSum += fb.interest; interestCount++; }
    if (fb.assignment != null) { assignmentSum += fb.assignment; assignmentCount++; }
    if (fb.practice != null) { practiceSum += fb.practice; practiceCount++; }
  }

  return {
    total: feedbacks.length,
    speedCounts, compCounts, commSum,
    comprehensionSum, comprehensionCount,
    materialHelpSum, materialHelpCount,
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

  const counts = computeFeedbackCounts(feedbacks);
  const { total, speedCounts, compCounts, commSum } = counts;
  return {
    communicationAvg: Math.round((commSum / total) * 10) / 10,
    speedModerateRatio: Math.round((speedCounts.moderate / total) * 100),
    comprehensionHighRatio: Math.round((compCounts.high / total) * 100),
    comprehensionAvg: counts.comprehensionCount > 0 ? Math.round((counts.comprehensionSum / counts.comprehensionCount) * 10) / 10 : 0,
    materialHelpAvg: counts.materialHelpCount > 0 ? Math.round((counts.materialHelpSum / counts.materialHelpCount) * 10) / 10 : 0,
    engagementAvg: counts.interestCount > 0 ? Math.round((counts.interestSum / counts.interestCount) * 10) / 10 : 0,
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
    const counts = computeFeedbackCounts(fbs);
    const { total, speedCounts, compCounts, commSum } = counts;
    result.set(courseId, {
      communicationAvg: Math.round((commSum / total) * 10) / 10,
      speedModerateRatio: Math.round((speedCounts.moderate / total) * 100),
      comprehensionHighRatio: Math.round((compCounts.high / total) * 100),
      comprehensionAvg: counts.comprehensionCount > 0 ? Math.round((counts.comprehensionSum / counts.comprehensionCount) * 10) / 10 : 0,
      materialHelpAvg: counts.materialHelpCount > 0 ? Math.round((counts.materialHelpSum / counts.materialHelpCount) * 10) / 10 : 0,
      engagementAvg: counts.interestCount > 0 ? Math.round((counts.interestSum / counts.interestCount) * 10) / 10 : 0,
      count: total,
    });
  }

  return result;
}
