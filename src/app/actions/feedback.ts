"use server";

import { prisma } from "@/lib/db";
import { filterComment } from "@/lib/comment-filter";
import { backgroundClassify } from "@/lib/classify-queue";

function parseFormData(formData: FormData) {
  const courseId = formData.get("courseId") as string;
  const token = formData.get("token") as string;
  const speed = formData.get("speed") as string;
  const comprehension = formData.get("comprehension") as string;
  const communication = Number(formData.get("communication"));
  const interest = formData.get("interest") ? Number(formData.get("interest")) : null;
  const assignment = formData.get("assignment") ? Number(formData.get("assignment")) : null;
  const practice = formData.get("practice") ? Number(formData.get("practice")) : null;
  const comment = (formData.get("comment") as string) || null;
  const freeText = (formData.get("freeText") as string) || null;
  const forceSubmit = formData.get("forceSubmit") === "true";

  return { courseId, token, speed, comprehension, communication, interest, assignment, practice, comment, freeText, forceSubmit };
}

const VALID_SPEED = ["fast", "moderate", "slow"] as const;
const VALID_COMPREHENSION = ["high", "medium", "low"] as const;

function validateBase(data: ReturnType<typeof parseFormData>) {
  if (!data.courseId || !data.token || !data.speed || !data.comprehension) {
    return "필수 항목을 모두 선택해주세요.";
  }
  if (!VALID_SPEED.includes(data.speed as (typeof VALID_SPEED)[number])) {
    return "올바른 수업 속도를 선택해주세요.";
  }
  if (!VALID_COMPREHENSION.includes(data.comprehension as (typeof VALID_COMPREHENSION)[number])) {
    return "올바른 이해도를 선택해주세요.";
  }
  if (isNaN(data.communication) || data.communication < 1 || data.communication > 5) {
    return "소통 만족도는 1~5점 사이여야 합니다.";
  }
  if (data.interest !== null && (isNaN(data.interest) || data.interest < 1 || data.interest > 5)) {
    return "강의 흥미도는 1~5점 사이여야 합니다.";
  }
  if (data.assignment !== null && (isNaN(data.assignment) || data.assignment < 1 || data.assignment > 5)) {
    return "과제 적절성은 1~5점 사이여야 합니다.";
  }
  if (data.practice !== null && (isNaN(data.practice) || data.practice < 1 || data.practice > 5)) {
    return "실습/예시 충분도는 1~5점 사이여야 합니다.";
  }
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
    communication: data.communication,
    interest: data.interest,
    assignment: data.assignment,
    practice: data.practice,
    comment: data.comment,
    freeText: data.freeText,
  };
}

// 기존 1회용 토큰 방식
export async function submitFeedback(formData: FormData) {
  const data = parseFormData(formData);
  const validationError = validateBase(data);
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
      return tx.feedback.create({ data: { courseId: data.courseId, ...feedbackData(data) } });
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

