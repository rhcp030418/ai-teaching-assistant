"use client";

import { useState } from "react";
import { AIChat } from "./ai-chat";

export function ChatSidePanel({
  courseId,
  suggestions,
}: {
  courseId: string;
  suggestions?: string[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* 플로팅 토글 버튼 */}
      <div className="fixed bottom-9 right-9 z-50 flex items-center gap-3 opacity-45 transition duration-200 hover:opacity-100 focus-within:opacity-100">
        {!open && (
          <span className="rounded-full border border-blue-100 bg-white/90 px-5 py-3 text-sm font-extrabold text-[#27496D] shadow-[0_14px_36px_rgba(23,87,168,0.12)] backdrop-blur">
            AI 강의 어시스턴트
          </span>
        )}
        <button
          onClick={() => setOpen((v) => !v)}
          className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-[#1677FF] via-[#1D8BFF] to-[#38BDF8] text-xl font-black text-white shadow-[0_20px_42px_rgba(22,119,255,0.34)] transition hover:-translate-y-1 hover:brightness-105 active:translate-y-0 active:brightness-95"
          title="AI 강의 어시스턴트"
        >
          {open ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            "AI"
          )}
        </button>
      </div>

      {/* 배경 오버레이 */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/20 transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* 사이드 패널 */}
      <div
        className={`fixed top-0 right-0 h-full w-[420px] z-50 flex flex-col bg-white shadow-2xl border-l border-blue-100 transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* 패널 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-blue-100 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#10233F]">AI 강의 어시스턴트</span>
            <span className="text-xs text-[#0F5FD7] bg-blue-50 px-2 py-0.5 rounded-full">
              스트리밍
            </span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-[#0F5FD7] hover:bg-blue-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* 채팅 콘텐츠 */}
        <div className="flex-1 min-h-0">
          <AIChat courseId={courseId} panel suggestions={suggestions} />
        </div>
      </div>
    </>
  );
}
