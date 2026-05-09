"use server";

import { prisma } from "@/lib/db";
import { filterComment } from "@/lib/comment-filter";
import { classifyComment } from "@/lib/comment-classifier";

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

function validateBase(data: ReturnType<typeof parseFormData>) {
  if (!data.courseId || !data.token || !data.speed || !data.comprehension) {
    return "필수 항목을 모두 선택해주세요.";
  }
  if (isNaN(data.communication) || data.communication < 1 || data.communication > 5) {
    return "소통 만족도는 1~5점 사이여야 합니다.";
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

  const feedbackToken = await prisma.feedbackToken.findUnique({ where: { token: data.token } });
  if (!feedbackToken || feedbackToken.courseId !== data.courseId || feedbackToken.used) {
    return { success: false, error: "유효하지 않거나 이미 사용된 토큰입니다." };
  }

  const [feedback] = await prisma.$transaction([
    prisma.feedback.create({ data: { courseId: data.courseId, ...feedbackData(data) } }),
    prisma.feedbackToken.update({ where: { token: data.token }, data: { used: true } }),
  ]);

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

  const [feedback] = await prisma.$transaction([
    prisma.feedback.create({
      data: { courseId: data.courseId, roundId: activeRound.id, ...feedbackData(data) },
    }),
    prisma.submissionLog.create({
      data: { studentId: studentToken.studentId, courseId: data.courseId, roundId: activeRound.id },
    }),
  ]);

  backgroundClassify(feedback.id, data.comment);
  return { success: true };
}

// ─── 백그라운드 AI 분류 큐 ───
// 1. 큐 기반 순차 처리 — 한 번에 1개씩만 AI 호출 (메모리 폭주 방지)
// 2. 큐 최대 길이 제한 — 비정상 폭증 시 가장 오래된 항목 드롭
// 3. 타임아웃 (TIMEOUT_MS) — AI가 느리면 강제 중단
// 4. 실패해도 commentCategory는 null로 유지 → 교수에게 노출 안 됨
const CLASSIFY_TIMEOUT_MS = 30_000;
const MAX_QUEUE_SIZE = 100;

type ClassifyJob = { feedbackId: string; comment: string };
const classifyQueue: ClassifyJob[] = [];
let classifyWorking = false;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("classify timeout")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

async function processClassifyQueue() {
  if (classifyWorking) return;
  classifyWorking = true;

  while (classifyQueue.length > 0) {
    const job = classifyQueue.shift()!;
    try {
      const result = await withTimeout(classifyComment(job.comment), CLASSIFY_TIMEOUT_MS);
      await prisma.feedback.update({
        where: { id: job.feedbackId },
        data: {
          filteredComment: result.filtered,
          commentCategory: result.category,
          commentFilterReason: result.reason,
          commentHasProfanity: result.hasProfanity,
        },
      });
    } catch {
      // 실패 시 commentCategory는 null로 유지 → 교수 노출 안 됨
    }
  }

  classifyWorking = false;
}

function backgroundClassify(feedbackId: string, comment: string | null) {
  if (!comment) return;

  // 큐 폭주 방지: 너무 길면 가장 오래된 것 드롭
  if (classifyQueue.length >= MAX_QUEUE_SIZE) {
    classifyQueue.shift();
  }

  classifyQueue.push({ feedbackId, comment });
  processClassifyQueue();
}
