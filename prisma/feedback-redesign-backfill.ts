import type { PrismaClient } from "../src/generated/prisma/client";

type FeedbackBackfillRow = {
  id: string;
  speed: string;
  comprehension: string;
  materialHelp: number | null;
  communication: number;
  interest: number | null;
  assignment: number | null;
  practice: number | null;
  positiveComment: string | null;
  difficultyComment: string | null;
  activityPoints: number;
  comment: string | null;
  filteredComment: string | null;
};

function comprehensionScore(value: string) {
  if (value === "high") return 5;
  if (value === "medium") return 3;
  if (value === "low") return 2;

  const parsed = Number(value);
  if (Number.isFinite(parsed)) return Math.min(5, Math.max(1, Math.round(parsed)));

  return 3;
}

function clampScore(value: number | null | undefined, fallback = 3) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(5, Math.max(1, Math.round(value ?? fallback)));
}

function splitLegacyComment(comment: string | null, filteredComment: string | null) {
  const text = (filteredComment || comment || "").trim();
  if (!text) return { positiveComment: null, difficultyComment: null };

  const positiveHints = [
    "좋",
    "도움",
    "이해됐",
    "이해가",
    "명확",
    "재미",
    "기억",
    "인상",
    "기대",
    "완전히",
  ];
  const difficultyHints = [
    "어렵",
    "부족",
    "빠르",
    "느리",
    "힘들",
    "아쉽",
    "필요",
    "요청",
    "헷갈",
    "부담",
    "복습",
    "예시",
  ];

  const hasPositive = positiveHints.some((hint) => text.includes(hint));
  const hasDifficulty = difficultyHints.some((hint) => text.includes(hint));

  if (hasPositive && !hasDifficulty) {
    return { positiveComment: text, difficultyComment: null };
  }
  if (hasDifficulty && !hasPositive) {
    return { positiveComment: null, difficultyComment: text };
  }

  if (text.includes("좋") && text.includes("지만")) {
    const [positive, ...rest] = text.split("지만");
    return {
      positiveComment: `${positive.trim()}지만`.trim(),
      difficultyComment: rest.join("지만").trim() || null,
    };
  }

  return { positiveComment: hasPositive ? text : null, difficultyComment: hasDifficulty ? text : null };
}

function activityPoints(positiveComment: string | null, difficultyComment: string | null) {
  let points = 1;
  if ((positiveComment ?? "").trim().length >= 10) points += 1;
  if ((difficultyComment ?? "").trim().length >= 10) points += 1;
  return points;
}

function nextFeedbackData(row: FeedbackBackfillRow) {
  const score = comprehensionScore(row.comprehension);
  const materialHelp = row.materialHelp ?? row.practice ?? score;
  const interest = row.interest ?? clampScore(Math.round((score + row.communication) / 2));
  const split = splitLegacyComment(row.comment, row.filteredComment);
  const positiveComment = row.positiveComment ?? split.positiveComment;
  const difficultyComment = row.difficultyComment ?? split.difficultyComment;

  return {
    comprehension: String(score),
    materialHelp: clampScore(materialHelp),
    interest: clampScore(interest),
    positiveComment,
    difficultyComment,
    activityPoints: activityPoints(positiveComment, difficultyComment),
  };
}

export async function backfillFeedbackRedesignFields(prisma: PrismaClient) {
  const rows = await prisma.feedback.findMany({
    select: {
      id: true,
      speed: true,
      comprehension: true,
      materialHelp: true,
      communication: true,
      interest: true,
      assignment: true,
      practice: true,
      positiveComment: true,
      difficultyComment: true,
      activityPoints: true,
      comment: true,
      filteredComment: true,
    },
  });

  let updated = 0;

  for (const row of rows) {
    const next = nextFeedbackData(row);
    const changed =
      row.comprehension !== next.comprehension ||
      row.materialHelp !== next.materialHelp ||
      row.interest !== next.interest ||
      row.positiveComment !== next.positiveComment ||
      row.difficultyComment !== next.difficultyComment ||
      row.activityPoints !== next.activityPoints;

    if (!changed) continue;

    await prisma.feedback.update({
      where: { id: row.id },
      data: next,
    });
    updated += 1;
  }

  return { checked: rows.length, updated };
}
