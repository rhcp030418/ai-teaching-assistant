"use client";

import { Button } from "@/components/ui/button";
import { useAIChat, isStreamingMsg, SUGGESTED_QUESTIONS } from "./use-ai-chat";

export function AIChat({
  courseId,
  panel,
  suggestions,
}: {
  courseId: string;
  panel?: boolean;
  suggestions?: string[];
}) {
  const {
    messages,
    input, setInput,
    isSending,
    copiedIndex,
    showScrollBtn,
    showRetry,
    bottomRef, textareaRef, scrollContainerRef,
    send, retry, copyMessage, exportChat,
    handleClearMessages, handleKeyDown, handleScroll, scrollToBottom,
  } = useAIChat(courseId);

  const chatActions = messages.length > 0 && (
    <>
      <button onClick={exportChat} className="text-xs text-slate-400 hover:text-[#0F5FD7]">
        내보내기
      </button>
      <span className="text-blue-100 select-none">|</span>
      <button onClick={handleClearMessages} className="text-xs text-slate-400 hover:text-[#0F5FD7]">
        대화 초기화
      </button>
    </>
  );

  const emptyState = (
    <div className="space-y-3 pt-2">
      <p className="text-sm text-slate-400 text-center">
        강의 피드백 데이터에 대해 무엇이든 물어보세요.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {(suggestions ?? SUGGESTED_QUESTIONS).map((q) => (
          <button
            key={q}
            onClick={() => send(q)}
            disabled={isSending}
            className="text-left text-xs text-[#27496D] bg-white/90 hover:bg-blue-50/70 border border-blue-100 rounded-lg px-3 py-2 transition-colors shadow-[0_8px_18px_-14px_rgba(23,87,168,0.3)] disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );

  const messageList = (
    <>
      {messages.map((msg, i) => (
        <div
          key={i}
          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div className="group relative max-w-[80%]">
            <div
              className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-gradient-to-br from-[#1677FF] to-[#38BDF8] text-white rounded-br-sm shadow-[0_10px_22px_-14px_rgba(22,119,255,0.7)]"
                  : "bg-white/95 border border-blue-100 text-[#27496D] rounded-bl-sm shadow-[0_8px_18px_-14px_rgba(23,87,168,0.3)]"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {isStreamingMsg(msg) && msg.content === "" && (
                <span className="flex gap-1 py-1">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
                </span>
              )}
              {isStreamingMsg(msg) && msg.content !== "" && (
                <span className="inline-block w-0.5 h-4 bg-slate-400 ml-0.5 animate-pulse align-text-bottom" />
              )}
            </div>
            {msg.role === "assistant" && !isStreamingMsg(msg) && msg.content && (
              <button
                onClick={() => copyMessage(msg.content, i)}
                className="absolute -bottom-5 left-1 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-slate-400 hover:text-[#0F5FD7]"
              >
                {copiedIndex === i ? "복사됨 ✓" : "복사"}
              </button>
            )}
          </div>
        </div>
      ))}
      {showRetry && (
        <div className="flex justify-start pl-1 pt-1">
          <button
            onClick={retry}
            className="text-xs text-slate-400 hover:text-[#0F5FD7] transition-colors"
          >
            ↺ 다시 생성
          </button>
        </div>
      )}
    </>
  );

  const messagesArea = (
    <div className={`relative ${panel ? "flex-1 min-h-0" : "h-80"}`}>
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className={`${
          panel ? "absolute inset-0" : "h-full"
        } overflow-y-auto px-4 py-4 space-y-3 bg-gradient-to-b from-[#f8fbff] to-blue-50/40`}
      >
        {messages.length === 0 ? emptyState : messageList}
        <div ref={bottomRef} />
      </div>
      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-3 right-4 bg-white border border-blue-100 rounded-full w-7 h-7 flex items-center justify-center shadow text-slate-500 hover:text-[#0F5FD7] text-xs"
        >
          ↓
        </button>
      )}
    </div>
  );

  const inputArea = (
    <div className="border-t border-blue-100 px-4 py-3 bg-white/95 space-y-1">
      <div className="flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSending}
          rows={1}
          placeholder="질문을 입력하세요 (Enter 전송, Shift+Enter 줄바꿈)"
          className="flex-1 resize-none text-sm border border-blue-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 disabled:opacity-50 bg-white text-[#27496D] placeholder:text-slate-400"
          style={{ minHeight: "36px", maxHeight: "120px" }}
        />
        <Button
          onClick={() => send()}
          disabled={!input.trim() || isSending}
          size="sm"
          className="bg-[#1677FF] text-white hover:bg-[#0F5FD7]"
        >
          전송
        </Button>
      </div>
      {input.length > 200 && (
        <p className={`text-right text-[11px] ${input.length > 3800 ? "text-red-400" : "text-slate-400"}`}>
          {input.length} / 4000
        </p>
      )}
    </div>
  );

  if (panel) {
    return (
      <div className="flex flex-col h-full">
        {messages.length > 0 && (
          <div className="px-5 py-2 flex justify-end items-center gap-3 border-b border-blue-50 bg-white/80">
            {chatActions}
          </div>
        )}
        {messagesArea}
        {inputArea}
      </div>
    );
  }

  return (
    <div className="bg-white/90 rounded-xl border border-blue-100 shadow-[0_10px_30px_-15px_rgba(23,87,168,0.25)] overflow-hidden">
      <div className="px-6 py-4 border-b border-blue-100 flex items-center gap-2">
        <span className="text-sm font-semibold text-[#10233F]">AI 강의 어시스턴트</span>
        <span className="text-xs text-slate-400 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
          스트리밍
        </span>
        {messages.length > 0 && (
          <div className="ml-auto flex items-center gap-3">{chatActions}</div>
        )}
      </div>
      {messagesArea}
      {inputArea}
    </div>
  );
}
