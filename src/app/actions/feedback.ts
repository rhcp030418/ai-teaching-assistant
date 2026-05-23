"use server";

import { prisma } from "@/lib/db";
import { filterComment } from "@/lib/comment-filter";
import { backgroundClassify } from "@/lib/classify-queue";

function parseFormData(formData: FormData) {
  const courseId = formData.get("courseId") as string;
  const token = formData.get("token") as string;
  const speed = formData.get("speed") as string;
  const comprehension = formData.get("comprehension") as string;
  const materialHelp = Number(formData.get("materialHelp"));
  const communication = Number(formData.get("communication"));
  const interest = formData.get("interest") ? Number(formData.get("interest")) : null;
  const assignment = formData.get("assignment") ? Number(formData.get("assignment")) : null;
  const practice = formData.get("practice") ? Number(formData.get("practice")) : null;
  const positiveComment = normalizeOptionalText(formData.get("positiveComment") as string);
  const difficultyComment = normalizeOptionalText(formData.get("difficultyComment") as string);
  const legacyComment = normalizeOptionalText(formData.get("comment") as string);
  const comment = combineComments(positiveComment, difficultyComment, legacyComment);
  const forceSubmit = formData.get("forceSubmit") === "true";

  return {
    courseId,
    token,
    speed,
    comprehension,
    materialHelp,
    communication,
    interest,
    assignment,
    practice,
    positiveComment,
    difficultyComment,
    comment,
    forceSubmit,
  };
}

const VALID_SPEED = ["very_slow", "slow", "moderate", "fast", "very_fast"] as const;
const VALID_LEGACY_SPEED = ["slow", "moderate", "fast"] as const;

function normalizeOptionalText(value: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function combineComments(
  positiveComment: string | null,
  difficultyComment: string | null,
  legacyComment: string | null
) {
  const parts: string[] = [];
  if (positiveComment) parts.push(`좋았던 점: ${positiveComment}`);
  if (difficultyComment) parts.push(`어려웠던 점: ${difficultyComment}`);
  if (parts.length > 0) return parts.join("\n\n");
  return legacyComment;
}

function isScore(value: number) {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

function activityPoints(positiveComment: string | null, difficultyComment: string | null) {
  let points = 1;
  if ((positiveComment?.trim().length ?? 0) >= 10) points += 1;
  if ((difficultyComment?.trim().length ?? 0) >= 10) points += 1;
  return points;
}

function validateBase(data: ReturnType<typeof parseFormData>) {
  const missing: string[] = [];
  if (!data.courseId || !data.token) missing.push("접근 정보");
  if (!data.speed) missing.push("수업 속도");
  if (!data.comprehension) missing.push("내용 이해");
  if (!isScore(data.materialHelp)) missing.push("자료·예시 도움");
  if (!isScore(data.communication)) missing.push("질문·소통 편의");
  if (data.interest === null || !isScore(data.interest)) missing.push("학습 몰입");
  if (missing.length > 0) {
    return `다음 필수 문항을 선택해주세요: ${missing.join(", ")}`;
  }
  if (
    !VALID_SPEED.includes(data.speed as (typeof VALID_SPEED)[number]) &&
    !VALID_LEGACY_SPEED.includes(data.speed as (typeof VALID_LEGACY_SPEED)[number])
  ) {
    return "올바른 수업 속도를 선택해주세요.";
  }
  if (!["1", "2", "3", "4", "5", "high", "medium", "low"].includes(data.comprehension)) {
    return "올바른 내용 이해 점수를 선택해주세요.";
  }
  if (!isScore(Number(data.comprehension))) {
    return "내용 이해는 1~5점 사이여야 합니다.";
  }
  if (data.assignment !== null && !isScore(data.assignment)) {
    return "과제 적절성은 1~5점 사이여야 합니다.";
  }
  if (data.practice !== null && !isScore(data.practice)) {
    return "실습·예시 도움은 1~5점 사이여야 합니다.";
  }
  return null;
}

function validateAdditionalFeedback(data: ReturnType<typeof parseFormData>) {
  if (!data.courseId || !data.token) return "유효하지 않은 링크입니다.";
  if (!data.comment?.trim()) return "피드백 내용을 작성해주세요.";
  return null;
}

function checkCommentFilter(comment: string | null, forceSubmit: boolean) {
  if (!comment) return null;
  const filter = filterComment(comment);
  if (filter.blocked) return { blocked: true, error: filter.reason! };
  if (filter.warned && !forceSubmit) return { warned: true, error: filter.reason! };
  return null;
}

function feedbackData(data: ReturnType<typeof parseFormData>) {
  return {
    speed: data.speed,
    comprehension: data.comprehension,
    materialHelp: data.materialHelp,
    communication: data.communication,
    interest: data.interest,
    assignment: data.assignment,
    practice: data.practice,
    positiveComment: data.positiveComment,
    difficultyComment: data.difficultyComment,
    activityPoints: activityPoints(data.positiveComment, data.difficultyComment),
    comment: data.comment,
  };
}

function additionalFeedbackData(data: ReturnType<typeof parseFormData>) {
  return {
    speed: "moderate",
    comprehension: "3",
    materialHelp: null,
    communication: 3,
    interest: null,
    assignment: null,
    practice: null,
    positiveComment: null,
    difficultyComment: null,
    activityPoints: 1,
    comment: data.comment,
  };
}

// 기존 1회용 토큰 방식
export async function submitFeedback(formData: FormData) {
  const data = parseFormData(formData);
  const validationError = validateAdditionalFeedback(data);
  if (validationError) return { success: false, error: validationError };

  const filterResult = checkCommentFilter(data.comment, data.forceSubmit);
  if (filterResult?.blocked) return { success: false, error: filterResult.error };
  if (filterResult?.warned) return { success: false, warned: true, error: filterResult.error };

  // 체크와 소비를 단일 트랜잭션으로 처리하여 TOCTOU 경쟁조건 방지
  let feedback;
  try {
    feedback = await prisma.$transaction(async (tx) => {
      const { count } = await tx.feedbackToken.updateMany({
        where: { token: data.token, courseId: data.courseId, used: false },
        data: { used: true },
      });
      if (count === 0) throw new Error("INVALID_TOKEN");
      return tx.feedback.create({ data: { courseId: data.courseId, ...additionalFeedbackData(data) } });
    });
  } catch {
    return { success: false, error: "유효하지 않거나 이미 사용된 토큰입니다." };
  }

  backgroundClassify(feedback.id, data.comment);
  return { success: true };
}

// 다회용 토큰 방식 (크롬 확장 → 학생 개인 링크)
export async function submitStudentFeedback(formData: FormData) {
  const data = parseFormData(formData);
  const validationError = validateBase(data);
  if (validationError) return { success: false, error: validationError };

  const filterResult = checkCommentFilter(data.comment, data.forceSubmit);
  if (filterResult?.blocked) return { success: false, error: filterResult.error };
  if (filterResult?.warned) return { success: false, warned: true, error: filterResult.error };

  const studentToken = await prisma.studentCourseToken.findUnique({
    where: { token: data.token },
    include: { student: true },
  });
  if (!studentToken || studentToken.courseId !== data.courseId) {
    return { success: false, error: "유효하지 않은 링크입니다." };
  }

  const now = new Date();
  const activeRound = await prisma.feedbackRound.findFirst({
    where: {
      courseId: data.courseId,
      startDate: { lte: now },
      endDate: { gt: now },
    },
    orderBy: [{ startDate: "desc" }, { week: "desc" }],
  });
  if (!activeRound) return { success: false, error: "현재 평가 기간이 아닙니다." };

  const existing = await prisma.submissionLog.findUnique({
    where: {
      studentId_courseId_roundId: {
        studentId: studentToken.studentId,
        courseId: data.courseId,
        roundId: activeRound.id,
      },
    },
  });
  if (existing) return { success: false, error: "이번 주차 평가를 이미 완료했습니다." };

  let feedback;
  try {
    [feedback] = await prisma.$transaction([
      prisma.feedback.create({
        data: { courseId: data.courseId, roundId: activeRound.id, ...feedbackData(data) },
      }),
      prisma.submissionLog.create({
        data: { studentId: studentToken.studentId, courseId: data.courseId, roundId: activeRound.id },
      }),
    ]);
  } catch {
    return { success: false, error: "이미 제출되었거나 제출 중 오류가 발생했습니다." };
  }

  backgroundClassify(feedback.id, data.comment);
  return { success: true };
}
