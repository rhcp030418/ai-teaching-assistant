"use client";

import { useState } from "react";
import { generateTokens } from "@/app/actions/tokens";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const V3_CARD =
  "ring-0 border-blue-100 bg-white/90 shadow-[0_10px_30px_-15px_rgba(23,87,168,0.25)]";

interface Props {
  courseId: string;
  initialStats: { total: number; used: number; unused: number };
  initialFeedbacks: { id: string; text: string; createdAt: string }[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TokenManager({ courseId, initialStats, initialFeedbacks }: Props) {
  const [stats, setStats] = useState(initialStats);
  const [count, setCount] = useState(30);
  const [generatedLinks, setGeneratedLinks] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [sortMode, setSortMode] = useState<"newest" | "oldest" | "longest" | "shortest">("newest");

  const sortedFeedbacks = [...initialFeedbacks].sort((a, b) => {
    if (sortMode === "longest") return b.text.length - a.text.length;
    if (sortMode === "shortest") return a.text.length - b.text.length;
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return sortMode === "oldest" ? aTime - bTime : bTime - aTime;
  });
  const visibleFeedbacks = feedbackOpen ? sortedFeedbacks : sortedFeedbacks.slice(0, 4);

  async function handleGenerate() {
    setPending(true);
    setError(null);
    setGeneratedLinks([]);

    const result = await generateTokens(courseId, count);
    setPending(false);

    if (result.success && result.tokens) {
      const { tokens } = result;
      const baseUrl = window.location.origin;
      const links = tokens.map(
        (token) => `${baseUrl}/feedback/${courseId}?token=${token}`
      );
      setGeneratedLinks(links);
      setStats((prev) => ({
        ...prev,
        total: prev.total + tokens.length,
        unused: prev.unused + tokens.length,
      }));
    } else {
      setError(result.error ?? "생성 실패");
    }
  }

  function handleCopyAll() {
    navigator.clipboard.writeText(generatedLinks.join("\n")).catch(() => {
      setError("클립보드 복사에 실패했습니다. 직접 텍스트를 선택해 복사해주세요.");
    });
  }

  return (
    <Card className={V3_CARD}>
      <CardHeader>
        <CardTitle className="text-base text-[#10233F]">추가 피드백 링크</CardTitle>
        <CardDescription className="text-slate-500">
          정규 주차 평가 외에 보충 의견이 필요할 때 사용할 1회용 익명 링크를 생성합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="flex gap-3">
          <Badge variant="secondary">전체 {stats.total}개</Badge>
          <Badge variant="secondary">사용됨 {stats.used}개</Badge>
          <Badge variant="outline">미사용 {stats.unused}개</Badge>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md">
            {error}
          </div>
        )}

        {/* Generate */}
        <div className="flex gap-2 items-center">
          <Input
            type="number"
            min={1}
            max={200}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-24"
          />
          <span className="text-sm text-gray-500">개</span>
          <Button onClick={handleGenerate} disabled={pending} size="sm">
            {pending ? "생성 중..." : "추가 피드백 링크 생성"}
          </Button>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50/55 px-3 py-2 text-xs font-medium leading-5 text-[#27496D]">
          이 링크로 제출된 의견은 특정 주차가 아닌 강의 전반에 대한 추가 피드백으로 저장됩니다.
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50/45 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-extrabold text-[#10233F]">추가 피드백 의견</p>
            <span className="rounded-full bg-white/75 px-2 py-1 text-[11px] font-bold text-amber-700">
              {initialFeedbacks.length}건
            </span>
          </div>
          {initialFeedbacks.length > 0 ? (
            <>
              <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-amber-100 bg-white/70 px-3 py-2">
                <span className="text-[11px] font-bold text-amber-700">정렬</span>
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as typeof sortMode)}
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
                <li key={feedback.id} className="rounded-xl bg-white/85 px-3 py-2 text-xs leading-5 text-[#27496D]">
                  <p className="font-semibold text-amber-700">{formatDate(feedback.createdAt)}</p>
                  <p className="mt-1 line-clamp-2">{feedback.text}</p>
                </li>
              ))}
              </ul>
              {initialFeedbacks.length > 4 && (
                <button
                  type="button"
                  onClick={() => setFeedbackOpen((v) => !v)}
                  className="mt-3 flex min-h-9 w-full items-center justify-center rounded-xl border border-amber-100 bg-white/80 text-xs font-extrabold text-amber-700 transition hover:bg-amber-50"
                >
                  {feedbackOpen ? "접기" : `전체 ${initialFeedbacks.length}건 보기`}
                </button>
              )}
            </>
          ) : (
            <p className="mt-2 text-xs font-medium leading-5 text-amber-700/80">
              아직 추가 피드백 링크로 제출된 의견이 없습니다. 제출되면 이 영역에 강의 전반 의견으로 모입니다.
            </p>
          )}
        </div>

        {/* Generated links */}
        {generatedLinks.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                생성된 링크 ({generatedLinks.length}개)
              </p>
              <Button size="sm" variant="outline" onClick={handleCopyAll}>
                전체 복사
              </Button>
            </div>
            <div className="bg-blue-50/60 rounded-lg p-3 max-h-48 overflow-y-auto">
              {generatedLinks.map((link, i) => (
                <p key={i} className="text-xs text-[#27496D] font-mono break-all">
                  {link}
                </p>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
