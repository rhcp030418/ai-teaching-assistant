"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { chatWithAI } from "@/lib/ai";
import { parseAIJson } from "@/lib/parse-ai-json";

export interface FilteredComment {
  original: string;
  filtered: string | null; // null = 제거됨
  category: "학습" | "감정" | "혼합";
  reason: string;
}

export interface FilterCommentsResult {
  comments: FilteredComment[];
  summary: {
    total: number;
    kept: number;
    removed: number;
    mixed: number;
  };
}

export async function filterComments(
  courseId: string
): Promise<{ success: boolean; result?: FilterCommentsResult; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "인증 필요" };

  const course = await prisma.course.findFirst({
    where: { id: courseId, professorId: session.user.id },
    select: { id: true },
  });
  if (!course) return { success: false, error: "강의를 찾을 수 없습니다." };

  const feedbacks = await prisma.feedback.findMany({
    where: { courseId, comment: { not: null } },
    select: { comment: true },
  });

  const comments = feedbacks
    .map((f) => f.comment!)
    .filter((c) => c.trim().length > 0);

  if (comments.length === 0) {
    return { success: false, error: "서술형 의견이 없습니다." };
  }

  try {
    const response = await chatWithAI([
      {
        role: "system",
        content: `당신은 대학 강의 피드백 필터링 전문가입니다. 학생 의견에서 감정적/비건설적 표현을 걸러내고 학습 관련 피드백만 추출합니다.

각 의견을 분류하세요:
- "학습": 수업 방식, 자료, 소통 등 학습 경험에 대한 건설적 피드백
- "감정": 감정 표출, 인신공격, 비건설적 불만 (제거 대상)
- "혼합": 학습 피드백이 섞여 있지만 감정적 표현도 포함 (순화 필요)

"혼합"인 경우 감정적 부분을 제거하고 학습 관련 내용만 남긴 순화 버전을 제공하세요.

반드시 다음 JSON 형식으로만 응답하세요:

[
  {
    "category": "학습 / 감정 / 혼합",
    "filtered": "순화된 텍스트 (학습이면 원문 그대로, 감정이면 null, 혼합이면 순화 버전)",
    "reason": "분류 근거 한 문장"
  }
]

입력 의견 수와 동일한 수의 결과를 순서대로 반환하세요.`,
      },
      {
        role: "user",
        content: comments.map((c, i) => `${i + 1}. "${c}"`).join("\n"),
      },
    ]);

    let parsed: { category: string; filtered: string | null; reason: string }[];
    try {
      const raw = parseAIJson<unknown>(response.content);
      if (!Array.isArray(raw)) {
        return { success: false, error: "AI 응답 형식이 올바르지 않습니다." };
      }
      if (raw.length !== comments.length) {
        return { success: false, error: "AI 응답 개수가 입력과 다릅니다." };
      }
      parsed = raw;
    } catch {
      return { success: false, error: "AI 응답을 파싱할 수 없습니다." };
    }

    const fallback = { category: "학습" as const, filtered: null, reason: "" };
    const result: FilteredComment[] = comments.map((original, i) => {
      const ai = parsed[i] ?? fallback;
      return {
        original,
        filtered: ai.category === "감정" ? null : (ai.filtered ?? original),
        category: (ai.category === "감정" || ai.category === "혼합" ? ai.category : "학습") as FilteredComment["category"],
        reason: ai.reason,
      };
    });

    const kept = result.filter((r) => r.category === "학습").length;
    const removed = result.filter((r) => r.category === "감정").length;
    const mixed = result.filter((r) => r.category === "혼합").length;

    return {
      success: true,
      result: {
        comments: result,
        summary: { total: result.length, kept, removed, mixed },
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI 필터링 실패";
    return { success: false, error: message };
  }
}

export async function summarizeComments(
  comments: string[]
): Promise<{ summary: string | null; error?: string }> {
  const all = comments.filter((t) => t.trim().length > 0);
  if (all.length === 0) return { summary: null };

  try {
    const response = await chatWithAI([
      {
        role: "system",
        content: `당신은 대학 강의 피드백 분석 전문가입니다. 학생 의견들을 읽고 핵심 내용을 2~3문장으로 요약하세요. 마크다운 문법은 사용하지 마세요. 긍정적 의견과 개선 요청을 균형 있게 반영하세요.`,
      },
      {
        role: "user",
        content: all.map((t, i) => `${i + 1}. ${t}`).join("\n"),
      },
    ]);
    return { summary: response.content.trim() };
  } catch (err) {
    const message = err instanceof Error ? err.message : "요약 실패";
    return { summary: null, error: message };
  }
}
