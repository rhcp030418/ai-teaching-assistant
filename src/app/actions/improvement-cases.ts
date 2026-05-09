"use server";

import { prisma } from "@/lib/db";
import { chatWithAI } from "@/lib/ai";
import { getPrevSemester, getStatsPerCourse } from "@/lib/feedback-stats";

export interface ImprovementNoteItem {
  note: string;
  sameCategory: boolean;
}

export interface ImprovementCase {
  label: string;
  beforeSemester: string;
  afterSemester: string;
  beforeAvg: number;
  afterAvg: number;
  change: number;
  changes: {
    speedModerate: { before: number; after: number };
    comprehensionHigh: { before: number; after: number };
  };
  aiInsight: string | null;
  // 해당 개선 축의 교수 노트 (같은 분야 먼저)
  notes: ImprovementNoteItem[];
  // 주요 개선 축
  primaryAxis: "communication" | "comprehension" | "speed";
}

export async function getImprovementCases(
  courseId: string
): Promise<ImprovementCase[]> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { semester: true, category: true, professorId: true },
  });
  if (!course) return [];

  const prevSemester = getPrevSemester(course.semester);

  const currentCourses = await prisma.course.findMany({
    where: { category: course.category, semester: course.semester },
    select: { id: true, professorId: true },
  });

  const prevCourses = await prisma.course.findMany({
    where: { category: course.category, semester: prevSemester },
    select: { id: true, professorId: true },
  });

  // Map professorId → list of courseIds (handles multiple prev courses per prof)
  const prevProfMap = new Map<string, string[]>();
  for (const c of prevCourses) {
    const arr = prevProfMap.get(c.professorId) ?? [];
    arr.push(c.id);
    prevProfMap.set(c.professorId, arr);
  }

  // Find professors in both semesters (exclude self)
  const pairs: { profId: string; prevCourseIds: string[]; currCourseId: string }[] = [];
  for (const c of currentCourses) {
    if (c.professorId === course.professorId) continue;
    const prevIds = prevProfMap.get(c.professorId);
    if (prevIds && prevIds.length > 0) {
      pairs.push({
        profId: c.professorId,
        prevCourseIds: prevIds,
        currCourseId: c.id,
      });
    }
  }

  if (pairs.length === 0) return [];

  // Batch get all stats
  const allCourseIds = pairs.flatMap((p) => [...p.prevCourseIds, p.currCourseId]);
  const statsMap = await getStatsPerCourse(allCourseIds);

  // 이 카테고리의 개선 노트를 축별로 미리 조회 (자기 강의 제외)
  const allNotes = await prisma.improvementNote.findMany({
    where: { courseId: { not: courseId } },
    select: { axis: true, note: true, category: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const cases: ImprovementCase[] = [];
  let labelIndex = 0;
  const labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  for (const pair of pairs) {
    const after = statsMap.get(pair.currCourseId);
    if (!after) continue;

    // Find the best prev course stats (use average if multiple)
    const prevStats = pair.prevCourseIds
      .map((id) => statsMap.get(id))
      .filter((s) => s !== undefined);
    if (prevStats.length === 0) continue;

    const beforeAvg =
      Math.round(
        (prevStats.reduce((s, p) => s + p.communicationAvg, 0) /
          prevStats.length) *
          10
      ) / 10;
    const beforeSpeedMod = Math.round(
      prevStats.reduce((s, p) => s + p.speedModerateRatio, 0) / prevStats.length
    );
    const beforeCompHigh = Math.round(
      prevStats.reduce((s, p) => s + p.comprehensionHighRatio, 0) /
        prevStats.length
    );

    const change = Math.round((after.communicationAvg - beforeAvg) * 10) / 10;
    if (change < 0.3) continue;

    // 주요 개선 축 판단
    const compDelta = after.comprehensionHighRatio - beforeCompHigh;
    const speedDelta = after.speedModerateRatio - beforeSpeedMod;
    let primaryAxis: "communication" | "comprehension" | "speed" = "communication";
    if (compDelta >= 10 && compDelta >= speedDelta) primaryAxis = "comprehension";
    else if (speedDelta >= 10 && speedDelta > compDelta) primaryAxis = "speed";

    // 해당 축의 노트 수집 (같은 카테고리 먼저)
    const axisNotes = allNotes
      .filter((n) => n.axis === primaryAxis)
      .map((n) => ({ note: n.note, sameCategory: n.category === course.category }))
      .sort((a, b) => (b.sameCategory ? 1 : 0) - (a.sameCategory ? 1 : 0))
      .slice(0, 3);

    cases.push({
      label: `익명 교수 ${labels[labelIndex % 26]}`,
      beforeSemester: prevSemester,
      afterSemester: course.semester,
      beforeAvg,
      afterAvg: after.communicationAvg,
      change,
      changes: {
        speedModerate: { before: beforeSpeedMod, after: after.speedModerateRatio },
        comprehensionHigh: { before: beforeCompHigh, after: after.comprehensionHighRatio },
      },
      aiInsight: null,
      notes: axisNotes,
      primaryAxis,
    });

    labelIndex++;
  }

  cases.sort((a, b) => b.change - a.change);
  return cases.slice(0, 3);
}

export interface MyCurrentStats {
  communicationAvg: number;
  speedModerateRatio: number;
  comprehensionHighRatio: number;
}

export async function getAIInsightForCase(
  improvementCase: ImprovementCase,
  myStats: MyCurrentStats
): Promise<string> {
  try {
    const response = await chatWithAI([
      {
        role: "system",
        content: `당신은 대학 강의 개선 컨설턴트입니다. 같은 카테고리에서 성과가 향상된 익명 교수의 사례와 현재 교수의 통계를 바탕으로 맞춤형 개선 제안을 해주세요.
현재 교수의 구체적인 수치를 언급하며 어떤 점을 개선하면 좋을지 제안하세요.
"~해보시면 어떨까요", "~가 도움이 될 수 있습니다" 형태로 2~3문장 이내로 작성하세요.
마크다운 문법(**, *, -, #, \`\`\` 등) 절대 사용 금지. 자연스러운 한국어 문장으로만 작성하세요.`,
      },
      {
        role: "user",
        content: `[개선 사례: ${improvementCase.label}]
학기 변화: ${improvementCase.beforeSemester} → ${improvementCase.afterSemester}
- 소통 만족도: ${improvementCase.beforeAvg}점 → ${improvementCase.afterAvg}점 (+${improvementCase.change})
- 수업 속도 '적당' 비율: ${improvementCase.changes.speedModerate.before}% → ${improvementCase.changes.speedModerate.after}%
- 자료 이해도 '높음' 비율: ${improvementCase.changes.comprehensionHigh.before}% → ${improvementCase.changes.comprehensionHigh.after}%

[현재 내 강의 통계]
- 소통 만족도: ${myStats.communicationAvg}점
- 수업 속도 '적당' 비율: ${myStats.speedModerateRatio}%
- 자료 이해도 '높음' 비율: ${myStats.comprehensionHighRatio}%

이 개선 사례에서 내 강의에 적용할 수 있는 점을 구체적으로 제안해주세요.`,
      },
    ]);
    return response.content;
  } catch {
    return "AI 분석을 불러올 수 없습니다.";
  }
}
