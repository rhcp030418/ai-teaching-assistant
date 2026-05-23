export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAIConfig } from "@/lib/ai/config";
import { TEACHING_TOOLBOX } from "@/lib/teaching-methods";
import { NextRequest } from "next/server";

// ─── 레이트 리밋 (분당 20회 / 유저) ──────────────────────────────────────────
const rlMap = new Map<string, { count: number; resetAt: number }>();
let rlCleanupTick = 0;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  if (++rlCleanupTick >= 100) {
    rlCleanupTick = 0;
    for (const [key, val] of rlMap) {
      if (now > val.resetAt) rlMap.delete(key);
    }
  }
  const entry = rlMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rlMap.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 20) return false;
  entry.count++;
  return true;
}

type AnyMessage = { role: "user" | "assistant" | "system"; content: string };

const encoder = new TextEncoder();

function emitToken(token: string) {
  return encoder.encode(`data: ${JSON.stringify({ token })}\n\n`);
}

function emitDone() {
  return encoder.encode("data: [DONE]\n\n");
}

// 시스템 프롬프트에서 금지한 마크다운 기호 제거 — 경량 모델이 규칙을 어겨도 화면엔 깔끔하게 표시.
// 문자 단위 치환이라 토큰이 청크 경계에서 쪼개져도 안전하다.
function sanitizeMarkdown(text: string): string {
  return text.replace(/[*`#]/g, "");
}

function errorStream(message: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(emitToken(message));
      controller.enqueue(emitDone());
      controller.close();
    },
  });
}

// ─── OpenAI-compatible 스트리밍 ────────────────────────────────────────────────
const PROVIDER_DEFAULTS: Record<string, { baseUrl: string; model: string }> = {
  openai: { baseUrl: "https://api.openai.com/v1", model: "gpt-4o" },
  grok: { baseUrl: "https://api.x.ai/v1", model: "grok-3-mini" },
  ollama: { baseUrl: "http://localhost:11434/v1", model: "llama3" },
};

async function streamOpenAICompatible(
  config: { apiKey?: string; baseUrl?: string; model?: string; provider?: string },
  messages: AnyMessage[],
): Promise<ReadableStream<Uint8Array>> {
  const defaults = PROVIDER_DEFAULTS[config.provider ?? "openai"] ?? PROVIDER_DEFAULTS.openai;
  const baseUrl = config.baseUrl || defaults.baseUrl;
  const model = config.model || defaults.model;

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify({ model, messages, stream: true, max_tokens: 2048 }),
    });
  } catch {
    return errorStream("AI 서버에 연결할 수 없습니다.");
  }

  if (!res.ok || !res.body) {
    if (res.status === 429) return errorStream("AI 서비스 사용량 한도에 도달했습니다. 잠시 후 다시 시도해주세요.");
    if (res.status === 401 || res.status === 403) return errorStream("AI API 인증에 실패했습니다. 설정의 API 키를 확인해주세요.");
    if (res.status >= 500) return errorStream("AI 서비스가 일시적으로 응답하지 않습니다. 잠시 후 다시 시도해주세요.");
    return errorStream(`AI 서비스 오류 (${res.status})`);
  }

  const decoder = new TextDecoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = res.body!.getReader();
      let buffer = "";
      try {
        outer: while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") break outer;
            try {
              const json = JSON.parse(data);
              const token = json.choices?.[0]?.delta?.content;
              if (token) controller.enqueue(emitToken(sanitizeMarkdown(token)));
            } catch { /* 불완전한 JSON 청크 무시 */ }
          }
        }
      } catch {
        controller.enqueue(emitToken("스트리밍 중 오류가 발생했습니다."));
      } finally {
        reader.cancel().catch(() => {});
        controller.enqueue(emitDone());
        try { controller.close(); } catch { /* 이미 닫힌 경우 무시 */ }
      }
    },
  });
}

// ─── Claude 스트리밍 ───────────────────────────────────────────────────────────
async function streamClaude(
  config: { apiKey?: string; model?: string },
  messages: AnyMessage[],
): Promise<ReadableStream<Uint8Array>> {
  const systemMsg = messages.find((m) => m.role === "system");
  const chatMessages = messages.filter((m) => m.role !== "system");

  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: config.model || "claude-sonnet-4-6",
        system: systemMsg?.content,
        messages: chatMessages,
        stream: true,
        max_tokens: 2048,
      }),
    });
  } catch {
    return errorStream("Claude API에 연결할 수 없습니다.");
  }

  if (!res.ok || !res.body) {
    if (res.status === 429) return errorStream("Claude API 사용량 한도에 도달했습니다. 잠시 후 다시 시도해주세요.");
    if (res.status === 401 || res.status === 403) return errorStream("Claude API 인증에 실패했습니다. API 키를 확인해주세요.");
    if (res.status >= 500) return errorStream("Claude API가 일시적으로 응답하지 않습니다. 잠시 후 다시 시도해주세요.");
    return errorStream(`Claude API 오류 (${res.status})`);
  }

  const decoder = new TextDecoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = res.body!.getReader();
      let buffer = "";
      try {
        outer: while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            try {
              const json = JSON.parse(data);
              if (json.type === "content_block_delta" && json.delta?.type === "text_delta") {
                controller.enqueue(emitToken(sanitizeMarkdown(json.delta.text)));
              } else if (json.type === "message_stop") {
                break outer;
              }
            } catch { /* 불완전한 JSON 청크 무시 */ }
          }
        }
      } catch {
        controller.enqueue(emitToken("스트리밍 중 오류가 발생했습니다."));
      } finally {
        reader.cancel().catch(() => {});
        controller.enqueue(emitDone());
        try { controller.close(); } catch { /* 이미 닫힌 경우 무시 */ }
      }
    },
  });
}

// ─── Gemini 스트리밍 ───────────────────────────────────────────────────────────
async function streamGemini(
  config: { apiKey?: string; model?: string },
  messages: AnyMessage[],
): Promise<ReadableStream<Uint8Array>> {
  const model = config.model || "gemini-2.5-flash";
  const systemMsg = messages.find((m) => m.role === "system");
  const chatMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const body: Record<string, unknown> = {
    contents: chatMessages,
    generationConfig: {
      maxOutputTokens: 4096,
      temperature: 0.4,
      // 경량 모델이 사고 과정(thinking)을 답변 본문에 흘리지 않도록 비활성화.
      // Flash 계열은 budget 0으로 사고를 끌 수 있다.
      thinkingConfig: { thinkingBudget: 0 },
    },
  };
  if (systemMsg) {
    body.systemInstruction = { parts: [{ text: systemMsg.content }] };
  }

  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${config.apiKey}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    );
  } catch {
    return errorStream("Gemini API에 연결할 수 없습니다.");
  }

  if (!res.ok || !res.body) {
    if (res.status === 429) return errorStream("Gemini API 사용량 한도에 도달했습니다. 잠시 후 다시 시도해주세요.");
    if (res.status === 401 || res.status === 403) return errorStream("Gemini API 인증에 실패했습니다. API 키를 확인해주세요.");
    if (res.status >= 500) return errorStream("Gemini API가 일시적으로 응답하지 않습니다. 잠시 후 다시 시도해주세요.");
    return errorStream(`Gemini API 오류 (${res.status})`);
  }

  const decoder = new TextDecoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = res.body!.getReader();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            try {
              const json = JSON.parse(data);
              const parts = json.candidates?.[0]?.content?.parts;
              if (!Array.isArray(parts)) continue;
              for (const part of parts) {
                if (part?.thought) continue; // 사고(thought) 요약 파트는 화면에 표시하지 않음
                if (typeof part?.text === "string" && part.text) {
                  controller.enqueue(emitToken(sanitizeMarkdown(part.text)));
                }
              }
            } catch { /* 불완전한 JSON 청크 무시 */ }
          }
        }
      } catch {
        controller.enqueue(emitToken("스트리밍 중 오류가 발생했습니다."));
      } finally {
        reader.cancel().catch(() => {});
        controller.enqueue(emitDone());
        try { controller.close(); } catch { /* 이미 닫힌 경우 무시 */ }
      }
    },
  });
}

// ─── POST 핸들러 ───────────────────────────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!checkRateLimit(session.user.id)) {
    return new Response("요청이 너무 많습니다. 잠시 후 다시 시도해주세요.", { status: 429 });
  }

  let body: { messages: AnyMessage[] };
  try {
    const raw = await req.json();
    if (!raw || !Array.isArray(raw.messages)) {
      return new Response("잘못된 요청 형식입니다.", { status: 400 });
    }
    const validated = (raw.messages as unknown[])
      .filter((m): m is { role: "user" | "assistant"; content: string } => {
        if (m === null || typeof m !== "object") return false;
        const msg = m as Record<string, unknown>;
        return (msg.role === "user" || msg.role === "assistant") && typeof msg.content === "string";
      })
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
    body = { messages: validated };
  } catch {
    return new Response("요청을 파싱할 수 없습니다.", { status: 400 });
  }
  const { courseId } = await params;

  const course = await prisma.course.findFirst({
    where: { id: courseId, professorId: session.user.id },
    include: {
      feedbacks: {
        select: {
          speed: true,
          comprehension: true,
          communication: true,
          interest: true,
          assignment: true,
          practice: true,
          filteredComment: true,
        },
      },
      lectureMaterials: {
        select: { fileName: true, analysis: true, roundId: true },
      },
      feedbackRounds: {
        orderBy: { week: "asc" },
        include: {
          feedbacks: {
            select: { speed: true, comprehension: true, communication: true },
          },
        },
      },
    },
  });

  if (!course) {
    return new Response("강의를 찾을 수 없습니다.", { status: 404 });
  }

  // ─── 컨텍스트 빌드 ────────────────────────────────────────────────────────────
  const contextParts: string[] = [
    `강의명: ${course.name}`,
    `학기: ${course.semester}`,
  ];

  if (course.category) contextParts.push(`분야: ${course.category}`);

  const total = course.feedbacks.length;
  contextParts.push(`총 피드백: ${total}건`);

  if (course.studentCount && course.studentCount > 0) {
    const rate = total <= course.studentCount
      ? Math.round((total / course.studentCount) * 100)
      : null;
    contextParts.push(
      rate !== null
        ? `응답률: 수강생 ${course.studentCount}명 중 ${total}명 응답 (${rate}%)`
        : `수강생 수: ${course.studentCount}명 (주차별 누적 응답으로 응답률 미산출)`,
    );
  }

  if (total > 0) {
    const speedCounts = { fast: 0, moderate: 0, slow: 0 };
    const compCounts = { high: 0, medium: 0, low: 0 };
    let commSum = 0;
    let interestSum = 0; let interestCount = 0;
    let assignSum = 0; let assignCount = 0;
    let practiceSum = 0; let practiceCount = 0;
    const comments: string[] = [];

    for (const fb of course.feedbacks) {
      const speed = fb.speed as keyof typeof speedCounts;
      const comp = fb.comprehension as keyof typeof compCounts;
      if (speed in speedCounts) speedCounts[speed]++;
      if (comp in compCounts) compCounts[comp]++;
      commSum += fb.communication;
      if (fb.interest != null) { interestSum += fb.interest; interestCount++; }
      if (fb.assignment != null) { assignSum += fb.assignment; assignCount++; }
      if (fb.practice != null) { practiceSum += fb.practice; practiceCount++; }
      if (fb.filteredComment) comments.push(fb.filteredComment);
    }

    const fastPct = Math.round((speedCounts.fast / total) * 100);
    const modPct = Math.round((speedCounts.moderate / total) * 100);
    const slowPct = Math.round((speedCounts.slow / total) * 100);
    const highPct = Math.round((compCounts.high / total) * 100);
    const medPct = Math.round((compCounts.medium / total) * 100);
    const lowPct = Math.round((compCounts.low / total) * 100);
    const commAvg = commSum / total;

    contextParts.push(
      `수업 속도: 빠름 ${fastPct}% / 적당 ${modPct}% / 느림 ${slowPct}%`,
      `자료 이해도: 높음 ${highPct}% / 보통 ${medPct}% / 낮음 ${lowPct}%`,
      `소통 만족도: 평균 ${commAvg.toFixed(1)}/5`,
    );

    if (interestCount > 0) contextParts.push(`강의 흥미도: 평균 ${(interestSum / interestCount).toFixed(1)}/5 (${interestCount}건)`);
    if (assignCount > 0) contextParts.push(`과제 적절성: 평균 ${(assignSum / assignCount).toFixed(1)}/5 (${assignCount}건)`);
    if (practiceCount > 0) contextParts.push(`실습/예시 충분도: 평균 ${(practiceSum / practiceCount).toFixed(1)}/5 (${practiceCount}건)`);

    // 주목 필요 영역
    const alerts: string[] = [];
    if (fastPct >= 40) alerts.push(`수업 속도 "빠름" 응답 ${fastPct}%로 높음 — 진도 조정 고려 필요`);
    if (slowPct >= 40) alerts.push(`수업 속도 "느림" 응답 ${slowPct}%로 높음 — 핵심 내용 압축 고려 필요`);
    if (lowPct >= 30) alerts.push(`자료 이해도 "낮음" 응답 ${lowPct}%로 높음 — 설명 방식 점검 필요`);
    if (commAvg < 3.0) alerts.push(`소통 만족도 평균 ${commAvg.toFixed(1)}점으로 낮음 — Q&A 기회 확대 필요`);
    if (interestCount > 0 && interestSum / interestCount < 3.0)
      alerts.push(`강의 흥미도 평균 ${(interestSum / interestCount).toFixed(1)}점으로 낮음`);
    if (alerts.length > 0) {
      contextParts.push(`주목 필요 영역:\n${alerts.map((a) => `  - ${a}`).join("\n")}`);
    }

    if (comments.length > 0) {
      contextParts.push(
        `학생 의견 (${Math.min(comments.length, 15)}건 샘플):\n${comments
          .slice(0, 15)
          .map((c, i) => `  ${i + 1}. ${c}`)
          .join("\n")}`,
      );
    }
  }

  // 회차별 데이터 + 트렌드
  const closedRounds = course.feedbackRounds.filter((r) => r.feedbacks.length > 0);
  if (closedRounds.length > 0) {
    const roundSummaries = closedRounds.map((r) => {
      const fbs = r.feedbacks;
      const commAvg = fbs.reduce((s, f) => s + f.communication, 0) / fbs.length;
      const highComp = Math.round((fbs.filter((f) => f.comprehension === "high").length / fbs.length) * 100);
      const speedMod = Math.round((fbs.filter((f) => f.speed === "moderate").length / fbs.length) * 100);
      return { label: r.label ?? `${r.week}주차`, commAvg, highComp, speedMod, count: fbs.length };
    });
    contextParts.push(
      `회차별 데이터:\n${roundSummaries
        .map((r) => `  ${r.label}: 이해도 ${r.highComp}%, 소통 ${r.commAvg.toFixed(1)}/5, 속도적절 ${r.speedMod}%, 응답 ${r.count}건`)
        .join("\n")}`,
    );

    if (roundSummaries.length >= 2) {
      const first = roundSummaries[0];
      const last = roundSummaries[roundSummaries.length - 1];
      const trendParts: string[] = [];
      const commDelta = Math.round((last.commAvg - first.commAvg) * 10) / 10;
      const compDelta = last.highComp - first.highComp;
      const speedDelta = last.speedMod - first.speedMod;
      if (Math.abs(commDelta) >= 0.3) trendParts.push(`소통 만족도 ${commDelta > 0 ? "+" : ""}${commDelta}점`);
      if (Math.abs(compDelta) >= 10) trendParts.push(`이해도 높음 ${compDelta > 0 ? "+" : ""}${compDelta}%p`);
      if (Math.abs(speedDelta) >= 10) trendParts.push(`속도 적절 ${speedDelta > 0 ? "+" : ""}${speedDelta}%p`);
      if (trendParts.length > 0) {
        contextParts.push(`첫→마지막 회차 추세 (${first.label}→${last.label}): ${trendParts.join(", ")}`);
      }
    }
  }

  // ─── 회차별 강의자료 현황 ────────────────────────────────────────────────────
  function buildMatLine(roundLabel: string, mat: { fileName: string; analysis: string | null; roundId: string | null }): string[] {
    if (!mat.analysis) {
      return [`  ${roundLabel}: ${mat.fileName} (분석 전 — 강의자료 분석 페이지에서 AI 분석 가능)`];
    }
    try {
      const a = JSON.parse(mat.analysis) as Record<string, unknown>;
      const lines: string[] = [`  ${roundLabel}: ${mat.fileName} (분석됨 — 난이도 ${a.difficulty}, 예시 ${a.exampleSufficiency})`];
      if (typeof a.summary === "string" && a.summary.length > 0) {
        const summary = a.summary.length > 120 ? a.summary.slice(0, 120) + "..." : a.summary;
        lines.push(`    내용 요약: ${summary}`);
      }
      if (Array.isArray(a.termExamples) && (a.termExamples as unknown[]).length > 0) {
        lines.push(`    주요 용어: ${(a.termExamples as string[]).slice(0, 4).join(", ")}`);
      }
      return lines;
    } catch {
      return [`  ${roundLabel}: ${mat.fileName} (분석됨)`];
    }
  }

  {
    const roundLabelMap = new Map<string, string>();
    for (const r of course.feedbackRounds) {
      roundLabelMap.set(r.id, r.label ?? `${r.week}주차`);
    }

    const materialsByRound = new Map<string | null, typeof course.lectureMaterials>();
    for (const mat of course.lectureMaterials) {
      const key = mat.roundId;
      if (!materialsByRound.has(key)) materialsByRound.set(key, []);
      materialsByRound.get(key)!.push(mat);
    }

    const matStatusLines: string[] = [];

    for (const r of course.feedbackRounds) {
      const label = roundLabelMap.get(r.id)!;
      const mats = materialsByRound.get(r.id) ?? [];
      if (mats.length === 0) {
        matStatusLines.push(`  ${label}: 강의자료 없음`);
      } else {
        for (const mat of mats) {
          matStatusLines.push(...buildMatLine(label, mat));
        }
      }
    }

    const unlinked = materialsByRound.get(null) ?? [];
    for (const mat of unlinked) {
      matStatusLines.push(...buildMatLine("주차 미지정", mat));
    }

    if (course.feedbackRounds.length > 0 || course.lectureMaterials.length > 0) {
      contextParts.push(
        `강의자료 현황:\n${matStatusLines.length > 0 ? matStatusLines.join("\n") : "  (등록된 강의자료 없음)"}`,
      );
    }
  }

  const systemPrompt = `당신은 대학 강의 분석 AI 어시스턴트입니다. 교수님의 강의 피드백 데이터를 기반으로 구체적이고 실질적인 조언을 제공합니다.

[가장 중요한 출력 규칙 — 반드시 지키세요]
- 교수님께 보여드릴 "최종 답변"만 출력하세요.
- 당신의 생각 과정, 초안, 자기 점검, 작업 메모를 절대 출력하지 마세요. 다음과 같은 표현은 금지입니다: "Wait", "잠깐", "the instruction says", "I will include this", "~를 포함해야겠다", "6. Review" 같은 골격/메타 코멘트.
- 답변을 영어 단어로 시작하거나, 따옴표로 시스템 지시문을 인용하지 마세요.
- *, **, #, >, \` 같은 마크다운 기호를 절대 사용하지 마세요. 숫자 목록(1. 2. 3.)과 줄바꿈만 허용됩니다.

[강의 데이터]
${contextParts.join("\n")}

답변 원칙:
1. 한국어로 자연스럽게 답변하세요.
2. 데이터에 있는 구체적인 수치(%, 점수, 건수)를 반드시 인용하세요.
3. *, **, #, > 같은 마크다운 기호는 절대 사용하지 마세요. 숫자 목록(1. 2. 3.)과 줄바꿈은 사용해도 됩니다.
4. 문제점을 언급하거나 개선 행동을 제안할 때는 반드시 1~2가지 구체적인 행동을 제시하되, 아래 [검증된 교수법 도구상자]에서 그 문제에 맞는 기법을 골라 구체적 실천 행동으로 풀고 기법 이름을 괄호로 표기하세요.
5. 회차별 데이터가 있으면 추세(개선/악화/유지)를 언급하세요.
6. 데이터에 없는 내용은 절대 추측하거나 지어내지 마세요.
7. 답변은 간결하되 핵심 인사이트는 빠짐없이 포함하세요.
8. 특정 주차의 강의자료 분석을 요청하는데 강의자료 현황에 해당 주차가 '강의자료 없음'으로 표시되어 있다면, "해당 주차에 연결된 강의자료가 없습니다. 강의자료 분석 메뉴에서 해당 주차로 자료를 업로드하시면 피드백과 연결된 분석을 받을 수 있습니다."라고 안내하세요.
9. 특정 주차의 강의자료가 '분석 전'으로 표시되어 있는데 분석 내용을 묻는다면, "해당 자료는 아직 분석되지 않았습니다. 강의자료 분석 메뉴에서 'AI 분석' 버튼을 클릭하시면 피드백과 연결된 심층 분석을 받을 수 있습니다."라고 안내하세요.

${TEACHING_TOOLBOX}`;

  const allMessages: AnyMessage[] = [
    { role: "system", content: systemPrompt },
    ...body.messages,
  ];

  const config = getAIConfig();

  let stream: ReadableStream<Uint8Array>;
  if (config.provider === "claude") {
    stream = await streamClaude(config, allMessages);
  } else if (config.provider === "gemini") {
    stream = await streamGemini(config, allMessages);
  } else {
    stream = await streamOpenAICompatible(config, allMessages);
  }

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
