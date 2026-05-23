"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ImprovementCase,
  MyCurrentStats,
  getAIInsightForCase,
} from "@/app/actions/improvement-cases";
import {
  DEMO_CASE_INSIGHT,
  DEMO_IMPROVEMENT_CASES,
  DEMO_MY_STATS,
} from "@/lib/demo-ai-fixtures";

const axisLabel: Record<string, string> = {
  communication: "질문·소통 편의",
  comprehension: "내용 이해",
  speed: "수업 속도",
};

const V3_CARD =
  "ring-0 border-blue-100 bg-white/90 shadow-[0_10px_30px_-15px_rgba(23,87,168,0.25)]";

function ChangeIndicator({
  label,
  before,
  after,
  unit,
}: {
  label: string;
  before: number;
  after: number;
  unit: string;
}) {
  const diff = Math.round((after - before) * 10) / 10;
  const isPositive = diff > 0;
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span>
        <span className="text-gray-400">
          {before}
          {unit}
        </span>
        <span className="mx-1">→</span>
        <span className="font-medium">
          {after}
          {unit}
        </span>
        <span
          className={`ml-1 text-xs ${isPositive ? "text-green-600" : diff < 0 ? "text-red-500" : "text-gray-400"}`}
        >
          ({isPositive ? "+" : ""}
          {diff}
          {unit})
        </span>
      </span>
    </div>
  );
}

function CaseCard({
  c,
  myStats,
  demoMode = false,
}: {
  c: ImprovementCase;
  myStats: MyCurrentStats;
  demoMode?: boolean;
}) {
  const [insight, setInsight] = useState<string | null>(
    demoMode ? (c.aiInsight ?? DEMO_CASE_INSIGHT) : c.aiInsight
  );
  const [loading, setLoading] = useState(false);

  async function handleAnalyze() {
    setLoading(true);
    if (demoMode) {
      setInsight(DEMO_CASE_INSIGHT);
      setLoading(false);
      return;
    }
    try {
      const result = await getAIInsightForCase(c, myStats);
      setInsight(result);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border border-blue-100 rounded-[18px] bg-white/80 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-sm">{c.label}</p>
          <p className="text-xs text-gray-400">
            {c.beforeSemester} → {c.afterSemester}
          </p>
        </div>
        <Badge className="bg-green-100 text-green-700 text-lg px-3">
          +{c.change}
        </Badge>
      </div>

      <div className="bg-blue-50/50 rounded-lg p-3 space-y-2">
        <ChangeIndicator
          label="질문·소통 편의"
          before={c.beforeAvg}
          after={c.afterAvg}
          unit="점"
        />
        <ChangeIndicator
          label="속도 '적당' 비율"
          before={c.changes.speedModerate.before}
          after={c.changes.speedModerate.after}
          unit="%"
        />
        <ChangeIndicator
          label="내용 이해 '높음' 비율"
          before={c.changes.comprehensionHigh.before}
          after={c.changes.comprehensionHigh.after}
          unit="%"
        />
      </div>

      {/* 교수 노트 */}
      {c.notes.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-gray-500 font-medium">
            {axisLabel[c.primaryAxis]} 개선 시 교수님들이 바꾼 점
          </p>
          {(() => {
            const same = c.notes.filter((n) => n.sameCategory);
            const other = c.notes.filter((n) => !n.sameCategory);
            return (
              <>
                {same.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-green-600 font-medium">같은 분야</p>
                    {same.map((n, i) => (
                      <div key={i} className="bg-green-50 rounded p-2 text-xs text-green-800">
                        &ldquo;{n.note}&rdquo;
                      </div>
                    ))}
                  </div>
                )}
                {other.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-gray-400 font-medium">다른 분야</p>
                    {other.map((n, i) => (
                      <div key={i} className="bg-blue-50/50 rounded p-2 text-xs text-[#27496D]">
                        &ldquo;{n.note}&rdquo;
                      </div>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* AI Insight */}
      {insight ? (
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-xs text-blue-500 font-medium mb-1">
            AI 맞춤 개선 제안
          </p>
          <p className="text-sm text-blue-800">{insight}</p>
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={handleAnalyze}
          disabled={loading}
          className="w-full"
        >
          {loading ? "분석 중..." : "내 강의에 적용하기"}
        </Button>
      )}
    </div>
  );
}

export function ImprovementCases({
  cases,
  myStats,
  demoMode = false,
}: {
  cases: ImprovementCase[];
  myStats: MyCurrentStats;
  demoMode?: boolean;
}) {
  const displayCases = demoMode && cases.length === 0 ? DEMO_IMPROVEMENT_CASES : cases;
  const displayStats = demoMode ? DEMO_MY_STATS : myStats;
  if (displayCases.length === 0) return null;

  return (
    <Card className={V3_CARD}>
      <CardHeader>
        <CardTitle className="text-base text-[#10233F]">개선 사례</CardTitle>
        <CardDescription className="text-slate-500">
          같은 카테고리에서 평점이 상승한 익명 교수들의 사례입니다.
          &quot;내 강의에 적용하기&quot;를 누르면 AI가 내 강의 통계와 비교해 맞춤 제안을 드립니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {displayCases.map((c, i) => (
          <div key={i}>
            {i > 0 && <Separator className="mb-4" />}
            <CaseCard c={c} myStats={displayStats} demoMode={demoMode} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
