"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { generateTrendNarrative, type TrendNarrative } from "@/app/actions/trend-analysis";
import type { RoundReport } from "@/app/actions/round-reports";
import { DEMO_TREND_NARRATIVE } from "@/lib/demo-ai-fixtures";

// ─── SVG 라인 차트 ───────────────────────────────────────────────────────────

const W = 720;
const H = 260;
const PAD = { top: 22, right: 32, bottom: 48, left: 48 };
const CW = W - PAD.left - PAD.right;
const CH = H - PAD.top - PAD.bottom;

const SERIES = [
  { key: "comprehensionHigh" as const, label: "내용 이해", color: "#10B981", strokeDash: "" },
  { key: "speedModerate" as const, label: "속도 적당", color: "#F5B544", strokeDash: "" },
  { key: "commNorm" as const, label: "질문·소통", color: "#1677FF", strokeDash: "" },
];

function xOf(i: number, n: number) {
  return PAD.left + (n > 1 ? (i / (n - 1)) * CW : CW / 2);
}
function yOf(v: number) {
  return PAD.top + (1 - Math.max(0, Math.min(100, v)) / 100) * CH;
}

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
  const n = points.length;
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
  const total = allPoints.length;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ minWidth: "560px" }}
        className="select-none"
      >
        <defs>
          <linearGradient id="trendArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#eff6ff" stopOpacity="0.15" />
          </linearGradient>
        </defs>

        {/* Plot area soft blue background */}
        <rect
          x={PAD.left}
          y={PAD.top}
          width={CW}
          height={CH}
          rx="10"
          fill="url(#trendArea)"
        />

        {/* Y grid lines */}
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={yOf(v)}
              y2={yOf(v)}
              stroke="#DBEAFE"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 6}
              y={yOf(v)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize="10"
              fill="#9aa9bc"
            >
              {v}
            </text>
          </g>
        ))}

        {/* Prediction divider */}
        {predicted && (
          <>
            <line
              x1={xOf(n - 1, total)}
              x2={xOf(n - 1, total)}
              y1={PAD.top}
              y2={PAD.top + CH}
              stroke="#bfdbfe"
              strokeWidth="1"
              strokeDasharray="4 3"
            />
            <text
              x={xOf(n - 1, total) + 4}
              y={PAD.top + 8}
              fontSize="9"
              fill="#9aa9bc"
            >
              예측
            </text>
          </>
        )}

        {/* Series */}
        {SERIES.map(({ key, color }) => {
          const histPts = points.map((p, i) => `${xOf(i, total)},${yOf(p[key])}`).join(" ");
          const predPt =
            predicted && total > n
              ? `${xOf(n - 1, total)},${yOf(points[n - 1][key])} ${xOf(n, total)},${yOf(allPoints[n][key])}`
              : null;

          return (
            <g key={key}>
              {/* Historical line */}
              <polyline
                points={histPts}
                fill="none"
                stroke={color}
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {/* Predicted dashed extension */}
              {predPt && (
                <polyline
                  points={predPt}
                  fill="none"
                  stroke={color}
                  strokeWidth="2"
                  strokeDasharray="5 4"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  opacity="0.7"
                />
              )}
              {/* Data points */}
              {points.map((p, i) => (
                <circle
                  key={i}
                  cx={xOf(i, total)}
                  cy={yOf(p[key])}
                  r="5.5"
                  fill="white"
                  stroke={color}
                  strokeWidth="2.75"
                />
              ))}
              {/* Predicted point */}
              {predicted && total > n && (
                <circle
                  cx={xOf(n, total)}
                  cy={yOf(allPoints[n][key])}
                  r="5"
                  fill={color}
                  opacity="0.4"
                  stroke={color}
                  strokeWidth="2"
                />
              )}
            </g>
          );
        })}

        {/* X axis labels */}
        {allPoints.map((p, i) => (
          <text
            key={i}
            x={xOf(i, total)}
            y={H - 6}
            textAnchor="middle"
            fontSize="11"
            fill={i === n && predicted ? "#9aa9bc" : "#27496D"}
          >
            {p.label ?? `${p.week}주`}
          </text>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex gap-5 justify-center mt-2 flex-wrap">
        {SERIES.map(({ key, label, color }) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span
              className="inline-block w-5 h-0.5 rounded"
              style={{ backgroundColor: color }}
            />
            {label}
          </div>
        ))}
        {predicted && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="inline-block w-5 h-0.5 border-t border-dashed border-slate-300" />
            다음 주차 예측
          </div>
        )}
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
              종료된 {validRounds.length}개 라운드에서 내용 이해·속도·질문 소통 반응이 어떻게 달라졌는지 보여줍니다.
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
                  <span className="text-amber-500">속도 적당 {narrative.predicted.speed}%</span>
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
