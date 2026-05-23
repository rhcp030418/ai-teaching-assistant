"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { chatWithAI } from "@/lib/ai";
import { getPrevSemester, getStatsPerCourse, type FeedbackStats } from "@/lib/feedback-stats";
import { TEACHING_TOOLBOX } from "@/lib/teaching-methods";

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
  const session = await auth();
  if (!session?.user?.id) return [];

  const course = await prisma.course.findUnique({
    where: { id: courseId, professorId: session.user.id },
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
      .filter((s): s is FeedbackStats => s !== undefined);
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
  const session = await auth();
  if (!session?.user?.id) return "로그인이 필요합니다.";

  try {
    const commGap = Math.round((improvementCase.afterAvg - myStats.communicationAvg) * 10) / 10;
    const compGap = improvementCase.changes.comprehensionHigh.after - myStats.comprehensionHighRatio;
    const speedGap = improvementCase.changes.speedModerate.after - myStats.speedModerateRatio;

    const axisLabel = {
      communication: "질문·소통 편의",
      comprehension: "내용 이해",
      speed: "수업 속도",
    }[improvementCase.primaryAxis];

    const notesText = improvementCase.notes.length > 0
      ? improvementCase.notes
          .map((n, i) => `  ${i + 1}. ${n.note}${n.sameCategory ? " (동일 분야)" : ""}`)
          .join("\n")
      : "  (기록된 변화 없음)";

    const gapLines = [
      commGap > 0 ? `- 질문·소통 편의: 현재 ${myStats.communicationAvg}점 vs 성공 사례 ${improvementCase.afterAvg}점 (격차 +${commGap})` : null,
      compGap > 5 ? `- 내용 이해 높음: 현재 ${myStats.comprehensionHighRatio}% vs 성공 사례 ${improvementCase.changes.comprehensionHigh.after}% (격차 +${compGap}%p)` : null,
      speedGap > 5 ? `- 속도 적절: 현재 ${myStats.speedModerateRatio}% vs 성공 사례 ${improvementCase.changes.speedModerate.after}% (격차 +${speedGap}%p)` : null,
    ].filter(Boolean).join("\n");

    const response = await chatWithAI([
      {
        role: "system",
        content: `당신은 대학 강의 개선 컨설턴트입니다. 실제로 개선에 성공한 익명 교수의 사례를 분석하여, 현재 교수가 다음 수업에서 즉시 실천할 수 있는 맞춤형 제안을 3문장으로 작성하세요.
1문장: 이 사례에서 가장 주목할 변화 — 수치와 함께, 교수가 실제 바꾼 점 중 핵심 한 가지를 반드시 언급하세요.
2문장: 현재 내 강의와 이 성공 사례 사이의 가장 좁힐 수 있는 격차 한 가지를 짚어주세요 (현재 내 강의 수치 포함).
3문장: "~해보시면 어떨까요" 또는 "~을 시도해보시길 추천합니다" 형식으로, 다음 수업에서 바로 할 수 있는 구체적 행동 한 가지를 제안하세요. 이때 아래 도구상자에서 이 사례의 개선 축에 맞는 기법을 골라 구체적 실천 행동으로 풀고, 기법 이름을 괄호로 표기하세요.
마크다운 문법(**, *, -, #, \`\`\` 등) 절대 사용 금지. 자연스러운 한국어 문장으로만 작성하세요.

${TEACHING_TOOLBOX}`,
      },
      {
        role: "user",
        content: `[성공 사례: ${improvementCase.label} / 주요 개선 축: ${axisLabel}]
학기 변화: ${improvementCase.beforeSemester} → ${improvementCase.afterSemester}
- 질문·소통 편의: ${improvementCase.beforeAvg}점 → ${improvementCase.afterAvg}점 (+${improvementCase.change})
- 수업 속도 '적당' 비율: ${improvementCase.changes.speedModerate.before}% → ${improvementCase.changes.speedModerate.after}%
- 내용 이해 '높음' 비율: ${improvementCase.changes.comprehensionHigh.before}% → ${improvementCase.changes.comprehensionHigh.after}%

[이 교수가 학기 사이에 바꾼 점 (교수 직접 기록)]
${notesText}

[현재 내 강의 통계]
- 질문·소통 편의: ${myStats.communicationAvg}점
- 수업 속도 '적당' 비율: ${myStats.speedModerateRatio}%
- 내용 이해 '높음' 비율: ${myStats.comprehensionHighRatio}%

[성공 사례 대비 격차]
${gapLines || "- 현재 모든 지표가 성공 사례 수준에 근접함"}

위 데이터를 바탕으로 현재 교수에게 맞춤형 실천 제안을 3문장으로 작성하세요.`,
      },
    ], { temperature: 0.3 });
    return response.content;
  } catch {
    return "AI 분석을 불러올 수 없습니다.";
  }
}
