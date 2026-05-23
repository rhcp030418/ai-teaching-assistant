"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { generateTrendNarrative, type TrendNarrative } from "@/app/actions/trend-analysis";
import type { RoundReport } from "@/app/actions/round-reports";
import { DEMO_TREND_NARRATIVE } from "@/lib/demo-ai-fixtures";

const SERIES = [
  { key: "comprehensionHigh" as const, label: "내용 이해", className: "bg-[#1677FF]" },
  { key: "commNorm" as const, label: "질문·소통", className: "bg-emerald-500" },
  { key: "speedModerate" as const, label: "적정 속도", className: "bg-amber-400" },
];

interface PlotPoint {
  week: number;
  label: string | null;
  comprehensionHigh: number;
  speedModerate: number;
  commNorm: number; // communicationAvg * 20
}

function TrendChart({
  points,
  predicted,
}: {
  points: PlotPoint[];
  predicted: TrendNarrative["predicted"] | null;
}) {
  const allPoints = predicted
    ? [
        ...points,
        {
          week: points[points.length - 1].week + 1,
          label: "예측",
          comprehensionHigh: predicted.comprehension,
          speedModerate: predicted.speed,
          commNorm: predicted.communication,
        },
      ]
    : points;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 rounded-2xl border border-blue-100 bg-blue-50/45 px-4 py-3">
        {SERIES.map(({ key, label, className }) => (
          <div key={key} className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <span className={`h-2.5 w-2.5 rounded-full ${className}`} />
            {label}
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {allPoints.map((point, pointIndex) => {
          const isPredicted = predicted && pointIndex === allPoints.length - 1;
          return (
            <div
              key={`${point.week}-${point.label ?? pointIndex}`}
              className={`rounded-2xl border p-4 ${
                isPredicted ? "border-dashed border-blue-200 bg-blue-50/35" : "border-blue-100 bg-white/75"
              }`}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-sm font-extrabold text-[#10233F]">
                  {point.label ?? `${point.week}주차`}
                </span>
                {isPredicted && (
                  <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-bold text-[#0F5FD7]">
                    다음 주차 예측
                  </span>
                )}
              </div>
              <div className="space-y-2.5">
                {SERIES.map(({ key, label, className }) => {
                  const value = Math.max(0, Math.min(100, Math.round(point[key])));
                  return (
                    <div key={key} className="grid grid-cols-[76px_minmax(0,1fr)_44px] items-center gap-3">
                      <span className="text-xs font-bold text-slate-500">{label}</span>
                      <div className="h-3 overflow-hidden rounded-full bg-blue-50">
                        <div className={`h-full rounded-full ${className}`} style={{ width: `${value}%` }} />
                      </div>
                      <span className="text-right text-xs font-extrabold text-[#10233F]">{value}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── 트렌드 배지 ──────────────────────────────────────────────────────────────

const TREND_META: Record<
  TrendNarrative["trend"],
  { label: string; className: string }
> = {
  improving: { label: "개선 추세", className: "bg-green-100 text-green-700" },
  worsening: { label: "하락 추세", className: "bg-red-100 text-red-700" },
  stable: { label: "안정적", className: "bg-blue-50 text-[#27496D] border border-blue-100" },
  mixed: { label: "혼재", className: "bg-amber-100 text-amber-700" },
};

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

interface Props {
  courseId: string;
  // roundReports.rounds는 최신순(reverse). 여기서 chronological로 변환해서 넘김.
  rounds: RoundReport[];
  demoMode?: boolean;
}

export function TrendAnalysis({ courseId, rounds, demoMode = false }: Props) {
  // 시간순 정렬 (week 오름차순)
  const sorted = [...rounds].sort((a, b) => a.week - b.week);
  const validRounds = sorted.filter((r) => r.totalFeedbacks > 0);

  const [narrative, setNarrative] = useState<TrendNarrative | null>(
    demoMode ? DEMO_TREND_NARRATIVE : null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (validRounds.length < 2) {
    return (
      <Card className="ring-0 border-blue-100 bg-white/90 shadow-[0_10px_30px_-15px_rgba(23,87,168,0.25)]">
        <CardHeader>
          <CardTitle className="text-base text-[#10233F]">주차별 평가 추이</CardTitle>
          <CardDescription className="text-slate-500">
            응답이 있는 라운드가 2개 이상 종료되면 주차별 평가 추이가 표시됩니다.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const plotPoints: PlotPoint[] = validRounds.map((r) => ({
    week: r.week,
    label: r.label,
    comprehensionHigh: r.comprehensionHigh,
    speedModerate: r.speedModerate,
    commNorm: Math.round(r.communicationAvg * 20),
  }));

  async function handleAnalyze() {
    setLoading(true);
    setError(null);
    if (demoMode) {
      setNarrative(DEMO_TREND_NARRATIVE);
      setLoading(false);
      return;
    }
    try {
      const res = await generateTrendNarrative(courseId, validRounds);
      if (res.success && res.result) {
        setNarrative(res.result);
      } else {
        setError(res.error ?? "분석 실패");
      }
    } catch {
      setError("분석 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const trendMeta = narrative ? TREND_META[narrative.trend] : null;
  const canPredict = validRounds.length >= 3;

  return (
    <Card className="ring-0 border-blue-100 bg-white/90 shadow-[0_10px_30px_-15px_rgba(23,87,168,0.25)]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base text-[#10233F]">주차별 평가 추이</CardTitle>
            <CardDescription className="text-slate-500">
              종료된 {validRounds.length}개 라운드에서 내용 이해·질문 소통·적정 속도 응답이 어떻게 달라졌는지 보여줍니다.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {trendMeta && (
              <Badge className={trendMeta.className}>{trendMeta.label}</Badge>
            )}
            {!narrative && (
              <Button
                size="sm"
                variant="outline"
                className="border-blue-200 text-[#0F5FD7] hover:bg-blue-50 hover:text-[#0F5FD7]"
                onClick={handleAnalyze}
                disabled={loading}
              >
                {loading ? "분석 중..." : "AI 분석"}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <TrendChart
          points={plotPoints}
          predicted={narrative?.predicted ?? null}
        />

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        {narrative && (
          <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-4">
            <p className="text-xs font-semibold text-[#0F5FD7] mb-2 flex items-center gap-1.5">
              <span className="rounded border border-blue-100 bg-blue-50 px-1.5 py-0.5 text-slate-400">AI</span>
              AI 분석
            </p>
            <p className="text-sm text-[#27496D] leading-relaxed">{narrative.narrative}</p>
            {narrative.predicted && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <p className="text-xs text-[#0F5FD7] font-medium mb-2">다음 주차 예측</p>
                <div className="flex gap-4 text-sm">
                  <span className="text-emerald-600">이해도 {narrative.predicted.comprehension}%</span>
                  <span className="text-[#1677FF]">질문·소통 {(narrative.predicted.communication / 20).toFixed(1)}/5</span>
                  <span className="text-amber-500">적정 속도 {narrative.predicted.speed}%</span>
                </div>
              </div>
            )}
            {!canPredict && (
              <p className="text-xs text-slate-400 mt-2">* 라운드가 1개 더 종료되면 다음 주차 예측이 활성화됩니다.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
