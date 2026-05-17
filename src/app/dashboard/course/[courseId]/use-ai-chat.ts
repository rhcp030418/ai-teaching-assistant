"use client";

import { useState, useRef, useEffect } from "react";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface StreamingMessage extends ChatMessage {
  role: "assistant";
  isStreaming: true;
}

export type Message = ChatMessage | StreamingMessage;

export function isStreamingMsg(msg: Message): msg is StreamingMessage {
  return "isStreaming" in msg && msg.isStreaming === true;
}

export const SUGGESTED_QUESTIONS = [
  "이번 학기에 학생들이 가장 불만인 게 뭐야?",
  "수업 속도를 어떻게 개선하면 좋을까?",
  "소통 만족도가 낮은 이유가 뭐라고 생각해?",
  "다음 회차에서 가장 집중해야 할 부분은?",
];

const MAX_STORED_MESSAGES = 40;

function storageKey(courseId: string) {
  return `ai-chat:${courseId}`;
}

export function useAIChat(courseId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  // localStorage 복원 + 자동 포커스
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey(courseId));
      if (saved) {
        const parsed = JSON.parse(saved) as Message[];
        setMessages(parsed.filter((m) => !isStreamingMsg(m)));
      }
    } catch { /* ignore */ }
    textareaRef.current?.focus();
  }, [courseId]);

  // 완료된 메시지만 저장 (최대 MAX_STORED_MESSAGES개)
  useEffect(() => {
    const completed = messages.filter((m) => !isStreamingMsg(m));
    if (completed.length === 0) {
      localStorage.removeItem(storageKey(courseId));
      return;
    }
    try {
      localStorage.setItem(
        storageKey(courseId),
        JSON.stringify(completed.slice(-MAX_STORED_MESSAGES))
      );
    } catch { /* storage full */ }
  }, [messages, courseId]);

  // 스크롤 위치가 하단이면 자동 스크롤
  useEffect(() => {
    if (isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // textarea 자동 높이 조절
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

  // 언마운트 시 진행 중인 스트림 abort
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  function handleScroll() {
    const el = scrollContainerRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    isAtBottomRef.current = dist < 80;
    setShowScrollBtn(dist > 120);
  }

  function scrollToBottom() {
    isAtBottomRef.current = true;
    setShowScrollBtn(false);
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  async function copyMessage(content: string, index: number) {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    } catch { /* clipboard API 미지원 무시 */ }
  }

  function exportChat() {
    const completed = messages.filter((m) => !isStreamingMsg(m));
    if (completed.length === 0) return;
    const body = completed
      .map((m) => `[${m.role === "user" ? "교수" : "AI 어시스턴트"}]\n${m.content}`)
      .join("\n\n" + "─".repeat(40) + "\n\n");
    const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AI채팅_${new Date().toLocaleDateString("ko-KR").replace(/[. ]/g, "")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // 명시적 history를 받아 전송 — retry에서 재사용
  async function sendWithHistory(content: string, prevHistory: ChatMessage[]) {
    if (!content || isSending) return;

    const userMsg: ChatMessage = { role: "user", content };
    const historyForRequest: ChatMessage[] = [...prevHistory, userMsg];

    isAtBottomRef.current = true;
    setMessages([
      ...prevHistory,
      userMsg,
      { role: "assistant", content: "", isStreaming: true } as StreamingMessage,
    ]);
    setIsSending(true);

    const controller = new AbortController();
    abortRef.current = controller;
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;

    try {
      const res = await fetch(`/api/ai-chat/${courseId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: historyForRequest }),
        signal: controller.signal,
      });

      if (!res.ok) {
        let errMsg = "오류가 발생했습니다. 다시 시도해주세요.";
        try {
          const text = await res.text();
          if (text && text.length < 200) errMsg = text;
        } catch { /* ignore */ }
        throw new Error(errMsg);
      }
      if (!res.body) throw new Error("응답 본문이 없습니다.");

      reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

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
            if (typeof json.token === "string") {
              accumulated += json.token;
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = {
                  role: "assistant",
                  content: accumulated,
                  isStreaming: true,
                } as StreamingMessage;
                return next;
              });
            }
          } catch { /* 불완전한 청크 무시 */ }
        }
      }

      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: accumulated };
        return next;
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: "assistant",
          content: err instanceof Error ? err.message : "오류가 발생했습니다. 다시 시도해주세요.",
        };
        return next;
      });
    } finally {
      reader?.cancel().catch(() => {});
      setIsSending(false);
      textareaRef.current?.focus();
    }
  }

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || isSending) return;
    setInput("");
    const prevHistory = messages.map(({ role, content }) => ({ role, content }));
    await sendWithHistory(content, prevHistory);
  }

  async function retry() {
    if (isSending) return;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        const content = messages[i].content;
        const prevHistory = messages
          .slice(0, i)
          .map(({ role, content }) => ({ role, content }));
        await sendWithHistory(content, prevHistory);
        return;
      }
    }
  }

  function handleClearMessages() {
    if (messages.length === 0) return;
    if (window.confirm("대화 내역을 모두 삭제하시겠습니까?")) {
      setMessages([]);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const lastMsg = messages[messages.length - 1];
  const showRetry =
    !!lastMsg && lastMsg.role === "assistant" && !isStreamingMsg(lastMsg) && !isSending;

  return {
    messages,
    input,
    setInput,
    isSending,
    copiedIndex,
    showScrollBtn,
    showRetry,
    bottomRef,
    textareaRef,
    scrollContainerRef,
    send,
    retry,
    copyMessage,
    exportChat,
    handleClearMessages,
    handleKeyDown,
    handleScroll,
    scrollToBottom,
  };
}
