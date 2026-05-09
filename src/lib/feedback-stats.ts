import { prisma } from "@/lib/db";

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

export async function getStatsForCourses(
  courseIds: string[]
): Promise<FeedbackStats | null> {
  if (courseIds.length === 0) return null;

  const feedbacks = await prisma.feedback.findMany({
    where: { courseId: { in: courseIds } },
  });

  if (feedbacks.length === 0) return null;

  const communicationSum = feedbacks.reduce((s, f) => s + f.communication, 0);
  const moderateCount = feedbacks.filter((f) => f.speed === "moderate").length;
  const highCount = feedbacks.filter((f) => f.comprehension === "high").length;

  return {
    communicationAvg:
      Math.round((communicationSum / feedbacks.length) * 10) / 10,
    speedModerateRatio: Math.round((moderateCount / feedbacks.length) * 100),
    comprehensionHighRatio: Math.round((highCount / feedbacks.length) * 100),
    count: feedbacks.length,
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
    if (fbs.length < 3) continue;
    const commSum = fbs.reduce((s, f) => s + f.communication, 0);
    const moderateCount = fbs.filter((f) => f.speed === "moderate").length;
    const highCount = fbs.filter((f) => f.comprehension === "high").length;
    result.set(courseId, {
      communicationAvg: Math.round((commSum / fbs.length) * 10) / 10,
      speedModerateRatio: Math.round((moderateCount / fbs.length) * 100),
      comprehensionHighRatio: Math.round((highCount / fbs.length) * 100),
      count: fbs.length,
    });
  }

  return result;
}

