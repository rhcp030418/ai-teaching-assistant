"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const V3_CARD =
  "ring-0 border-blue-100 bg-white/90 shadow-[0_10px_30px_-15px_rgba(23,87,168,0.25)]";

interface AdditionalFeedback {
  id: string;
  text: string;
  createdAt: string;
}

interface Props {
  feedbacks: AdditionalFeedback[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type SortMode = "newest" | "oldest" | "longest" | "shortest";

export function AdditionalFeedbackReport({ feedbacks }: Props) {
  const [open, setOpen] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  const sortedFeedbacks = [...feedbacks].sort((a, b) => {
    if (sortMode === "longest") return b.text.length - a.text.length;
    if (sortMode === "shortest") return a.text.length - b.text.length;
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return sortMode === "oldest" ? aTime - bTime : bTime - aTime;
  });
  const visibleFeedbacks = open ? sortedFeedbacks : sortedFeedbacks.slice(0, 4);

  return (
    <Card className={V3_CARD}>
      <CardHeader>
        <CardTitle className="text-base text-[#10233F]">추가 피드백 리포트</CardTitle>
        <CardDescription className="text-slate-500">
          추가 피드백 링크로 제출된, 특정 주차가 아닌 강의 전반에 대한 의견입니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-2xl border border-amber-100 bg-amber-50/45 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-extrabold text-[#10233F]">추가 피드백 의견</p>
            <span className="rounded-full bg-white/75 px-2 py-1 text-[11px] font-bold text-amber-700">
              {feedbacks.length}건
            </span>
          </div>

          {feedbacks.length > 0 ? (
            <>
              <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-amber-100 bg-white/70 px-3 py-2">
                <span className="text-[11px] font-bold text-amber-700">정렬</span>
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  className="rounded-full border border-amber-100 bg-white px-2 py-1 text-[11px] font-bold text-[#27496D] outline-none"
                >
                  <option value="newest">최신순</option>
                  <option value="oldest">오래된 순</option>
                  <option value="longest">글자수 많은 순</option>
                  <option value="shortest">글자수 적은 순</option>
                </select>
              </div>

              <ul className="mt-3 space-y-2">
                {visibleFeedbacks.map((feedback) => (
                  <li
                    key={feedback.id}
                    className="rounded-xl bg-white/85 px-3 py-2 text-xs leading-5 text-[#27496D]"
                  >
                    <p className="font-semibold text-amber-700">{formatDate(feedback.createdAt)}</p>
                    <p className={`mt-1 ${open ? "" : "line-clamp-2"}`}>{feedback.text}</p>
                  </li>
                ))}
              </ul>

              {feedbacks.length > 4 && (
                <button
                  type="button"
                  onClick={() => setOpen((v) => !v)}
                  className="mt-3 flex min-h-9 w-full items-center justify-center rounded-xl border border-amber-100 bg-white/80 text-xs font-extrabold text-amber-700 transition hover:bg-amber-50"
                >
                  {open ? "접기" : `전체 ${feedbacks.length}건 보기`}
                </button>
              )}
            </>
          ) : (
            <p className="mt-2 text-xs font-medium leading-5 text-amber-700/80">
              아직 추가 피드백 링크로 제출된 의견이 없습니다. 제출되면 이 영역에 강의 전반 의견으로 모입니다.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
