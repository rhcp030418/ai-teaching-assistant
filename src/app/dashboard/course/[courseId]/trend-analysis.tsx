"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { generateTrendNarrative, type TrendNarrative } from "@/app/actions/trend-analysis";
import type { RoundReport } from "@/app/actions/round-reports";

// ─── SVG 라인 차트 ───────────────────────────────────────────────────────────

const W = 600;
const H = 180;
const PAD = { top: 16, right: 24, bottom: 40, left: 40 };
const CW = W - PAD.left - PAD.right;
const CH = H - PAD.top - PAD.bottom;

const SERIES = [
  { key: "comprehensionHigh" as const, label: "이해도", color: "#22c55e", strokeDash: "" },
  { key: "speedModerate" as const, label: "속도 적절", color: "#f97316", strokeDash: "" },
  { key: "commNorm" as const, label: "소통 만족도", color: "#3b82f6", strokeDash: "" },
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
        style={{ minWidth: "320px" }}
        className="select-none"
      >
        {/* Y grid lines */}
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={yOf(v)}
              y2={yOf(v)}
              stroke="#f0f0f0"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 6}
              y={yOf(v)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize="10"
              fill="#9ca3af"
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
              stroke="#d1d5db"
              strokeWidth="1"
              strokeDasharray="4 3"
            />
            <text
              x={xOf(n - 1, total) + 4}
              y={PAD.top + 8}
              fontSize="9"
              fill="#9ca3af"
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
                strokeWidth="2.5"
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
                  r="4"
                  fill="white"
                  stroke={color}
                  strokeWidth="2"
                />
              ))}
              {/* Predicted point */}
              {predicted && total > n && (
                <circle
                  cx={xOf(n, total)}
                  cy={yOf(allPoints[n][key])}
                  r="4"
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
            fill={i === n && predicted ? "#9ca3af" : "#6b7280"}
          >
            {p.label ?? `${p.week}주`}
          </text>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex gap-5 justify-center mt-2 flex-wrap">
        {SERIES.map(({ key, label, color }) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span
              className="inline-block w-5 h-0.5 rounded"
              style={{ backgroundColor: color }}
            />
            {label}
          </div>
        ))}
        {predicted && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="inline-block w-5 h-0.5 border-t border-dashed border-gray-400" />
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
  stable: { label: "안정적", className: "bg-gray-100 text-gray-600" },
  mixed: { label: "혼재", className: "bg-yellow-100 text-yellow-700" },
};

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

interface Props {
  courseId: string;
  // roundReports.rounds는 최신순(reverse). 여기서 chronological로 변환해서 넘김.
  rounds: RoundReport[];
}

export function TrendAnalysis({ courseId, rounds }: Props) {
  // 시간순 정렬 (week 오름차순)
  const sorted = [...rounds].sort((a, b) => a.week - b.week);
  const validRounds = sorted.filter((r) => r.totalFeedbacks > 0);

  const [narrative, setNarrative] = useState<TrendNarrative | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (validRounds.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">주차별 트렌드</CardTitle>
          <CardDescription>
            응답이 있는 라운드가 2개 이상 종료되면 트렌드 차트가 표시됩니다.
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
    const res = await generateTrendNarrative(courseId, validRounds);
    setLoading(false);
    if (res.success && res.result) {
      setNarrative(res.result);
    } else {
      setError(res.error ?? "분석 실패");
    }
  }

  const trendMeta = narrative ? TREND_META[narrative.trend] : null;
  const canPredict = validRounds.length >= 3;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">주차별 트렌드</CardTitle>
            <CardDescription>종료된 {validRounds.length}개 라운드 기반</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {trendMeta && (
              <Badge className={trendMeta.className}>{trendMeta.label}</Badge>
            )}
            {!narrative && (
              <Button
                size="sm"
                variant="outline"
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
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <p className="text-xs font-semibold text-blue-600 mb-2 flex items-center gap-1.5">
              <span className="bg-blue-200 text-blue-700 px-1.5 py-0.5 rounded">AI</span>
              AI 분석
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">{narrative.narrative}</p>
            {narrative.predicted && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <p className="text-xs text-blue-500 font-medium mb-2">다음 주차 예측</p>
                <div className="flex gap-4 text-sm">
                  <span className="text-green-600">이해도 {narrative.predicted.comprehension}%</span>
                  <span className="text-blue-600">소통 {(narrative.predicted.communication / 20).toFixed(1)}/5</span>
                  <span className="text-orange-500">속도적절 {narrative.predicted.speed}%</span>
                </div>
              </div>
            )}
            {!canPredict && (
              <p className="text-xs text-gray-400 mt-2">* 라운드가 1개 더 종료되면 다음 주차 예측이 활성화됩니다.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
