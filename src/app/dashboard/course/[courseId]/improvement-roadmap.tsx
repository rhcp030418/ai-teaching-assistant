"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { generateRoadmap, ImprovementRoadmapData } from "@/app/actions/improvement-roadmap";
import { DEMO_IMPROVEMENT_ROADMAP } from "@/lib/demo-ai-fixtures";

const IMPACT_CONFIG: Record<string, { label: string; badgeClass: string; borderClass: string }> = {
  high: {
    label: "우선 확인",
    badgeClass: "bg-amber-100 text-amber-700",
    borderClass: "border-amber-200",
  },
  medium: {
    label: "참고 권장",
    badgeClass: "bg-amber-100 text-amber-700",
    borderClass: "border-amber-200",
  },
  low: {
    label: "관찰 필요",
    badgeClass: "bg-blue-100 text-blue-700",
    borderClass: "border-blue-200",
  },
};

export function ImprovementRoadmapPanel({
  courseId,
  demoMode = false,
}: {
  courseId: string;
  demoMode?: boolean;
}) {
  const [result, setResult] = useState<ImprovementRoadmapData | null>(
    demoMode ? DEMO_IMPROVEMENT_ROADMAP : null
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    setError(null);
    if (demoMode) {
      setResult(DEMO_IMPROVEMENT_ROADMAP);
      return;
    }
    startTransition(async () => {
      try {
        const res = await generateRoadmap(courseId);
        if (res.success && res.result) {
          setResult(res.result);
        } else {
          setError(res.error ?? "오류가 발생했습니다.");
        }
      } catch {
        setError("로드맵 생성 중 오류가 발생했습니다.");
      }
    });
  }

  return (
    <div className="rounded-[22px] border border-blue-100 bg-white/90 shadow-[0_10px_30px_-15px_rgba(23,87,168,0.25)]">
      {/* 헤더 */}
      <div className="px-6 py-4 border-b border-blue-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-[#10233F]">AI 강의 개선 로드맵</h3>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            피드백 기반 다음 회차 우선순위 행동 계획
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={isPending} size="sm" variant="outline">
          {isPending ? "분석 중..." : result ? "재생성" : "로드맵 생성"}
        </Button>
      </div>

      {/* 오류 */}
      {error && (
        <div className="px-6 py-4 text-sm text-red-600 bg-red-50 border-b border-red-100">
          {error}
        </div>
      )}

      {/* 결과 */}
      {result && (
        <div className="px-6 py-5 space-y-5">
          {/* 전체 평가 요약 */}
          <p className="text-sm text-[#27496D] leading-relaxed">{result.summary}</p>

          {/* 다음 회차 목표 */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
            <p className="text-xs font-medium text-blue-500 mb-1">다음 회차 목표</p>
            <p className="text-sm font-semibold text-blue-800">{result.weeklyGoal}</p>
          </div>

          {/* 우선순위 카드 */}
          <div className="space-y-3">
            {Array.isArray(result.priorities) && result.priorities.map((p, idx) => {
              const cfg = IMPACT_CONFIG[p.impact] ?? IMPACT_CONFIG.medium;
              return (
                <div
                  key={typeof p.rank === "number" ? p.rank : idx}
                  className={`border rounded-xl bg-white/75 p-4 space-y-2.5 ${cfg.borderClass}`}
                >
                  {/* 제목 행 */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-[#1677FF] to-[#38BDF8] text-white text-xs flex items-center justify-center font-bold shadow-[0_8px_16px_-10px_rgba(22,119,255,0.7)]">
                        {p.rank}
                      </span>
                      <span className="text-sm font-semibold text-[#10233F]">{p.area}</span>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${cfg.badgeClass}`}
                    >
                      {cfg.label}
                    </span>
                  </div>

                  {/* 문제 설명 */}
                  <p className="text-sm text-[#27496D] pl-8">{p.problem}</p>

                  {/* 근거 + 행동 계획 */}
                  <div className="pl-8 space-y-2">
                    <p className="text-xs text-gray-400">근거: {p.evidence}</p>
                    <div className="bg-blue-50/60 rounded-lg px-3 py-2.5">
                      <p className="text-xs font-medium text-[#0F5FD7] mb-1">행동 계획</p>
                      <p className="text-sm text-[#27496D]">{p.action}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 초기 상태 */}
      {!result && !error && !isPending && (
        <div className="px-6 py-10 text-center text-sm text-gray-400">
          버튼을 눌러 AI 기반 개선 우선순위를 확인하세요.
        </div>
      )}

      {/* 로딩 스켈레톤 */}
      {isPending && (
        <div className="px-6 py-5 space-y-4 animate-pulse">
          <div className="h-4 bg-gray-100 rounded w-3/4" />
          <div className="h-4 bg-gray-100 rounded w-1/2" />
          <div className="h-16 bg-blue-50 rounded-lg" />
          <div className="h-24 bg-gray-50 rounded-xl border border-gray-100" />
          <div className="h-24 bg-gray-50 rounded-xl border border-gray-100" />
        </div>
      )}
    </div>
  );
}
