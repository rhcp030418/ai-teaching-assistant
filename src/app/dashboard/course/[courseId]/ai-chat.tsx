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
      <button onClick={exportChat} className="text-xs text-gray-400 hover:text-gray-600">
        내보내기
      </button>
      <span className="text-gray-200 select-none">|</span>
      <button onClick={handleClearMessages} className="text-xs text-gray-400 hover:text-gray-600">
        대화 초기화
      </button>
    </>
  );

  const emptyState = (
    <div className="space-y-3 pt-2">
      <p className="text-sm text-gray-400 text-center">
        강의 피드백 데이터에 대해 무엇이든 물어보세요.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {(suggestions ?? SUGGESTED_QUESTIONS).map((q) => (
          <button
            key={q}
            onClick={() => send(q)}
            disabled={isSending}
            className="text-left text-xs text-gray-600 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 transition-colors shadow-sm disabled:opacity-50"
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
                  ? "bg-blue-600 text-white rounded-br-sm"
                  : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {isStreamingMsg(msg) && msg.content === "" && (
                <span className="flex gap-1 py-1">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                </span>
              )}
              {isStreamingMsg(msg) && msg.content !== "" && (
                <span className="inline-block w-0.5 h-4 bg-gray-400 ml-0.5 animate-pulse align-text-bottom" />
              )}
            </div>
            {msg.role === "assistant" && !isStreamingMsg(msg) && msg.content && (
              <button
                onClick={() => copyMessage(msg.content, i)}
                className="absolute -bottom-5 left-1 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-gray-400 hover:text-gray-600"
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
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
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
        } overflow-y-auto px-4 py-4 space-y-3 bg-gray-50/40`}
      >
        {messages.length === 0 ? emptyState : messageList}
        <div ref={bottomRef} />
      </div>
      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-3 right-4 bg-white border border-gray-200 rounded-full w-7 h-7 flex items-center justify-center shadow text-gray-500 hover:text-gray-800 text-xs"
        >
          ↓
        </button>
      )}
    </div>
  );

  const inputArea = (
    <div className="border-t border-gray-100 px-4 py-3 bg-white space-y-1">
      <div className="flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSending}
          rows={1}
          placeholder="질문을 입력하세요 (Enter 전송, Shift+Enter 줄바꿈)"
          className="flex-1 resize-none text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 bg-white"
          style={{ minHeight: "36px", maxHeight: "120px" }}
        />
        <Button onClick={() => send()} disabled={!input.trim() || isSending} size="sm">
          전송
        </Button>
      </div>
      {input.length > 200 && (
        <p className={`text-right text-[11px] ${input.length > 3800 ? "text-red-400" : "text-gray-400"}`}>
          {input.length} / 4000
        </p>
      )}
    </div>
  );

  if (panel) {
    return (
      <div className="flex flex-col h-full">
        {messages.length > 0 && (
          <div className="px-5 py-2 flex justify-end items-center gap-3 border-b border-gray-50">
            {chatActions}
          </div>
        )}
        {messagesArea}
        {inputArea}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-700">AI 강의 어시스턴트</span>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
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
