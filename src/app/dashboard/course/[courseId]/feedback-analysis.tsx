"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadarChart } from "./radar-chart";
import { generateRadarSummary } from "@/app/actions/radar-summary";
import { summarizeComments } from "@/app/actions/filter-comments";
import { calcResponseRate } from "@/lib/utils";
import { DEMO_COMMENT_SUMMARY } from "@/lib/demo-ai-fixtures";

// V3 카드 표면: shadcn Card 기본(회색)을 덮어쓰는 공통 클래스
const V3_CARD =
  "ring-0 border-blue-100 bg-white/90 shadow-[0_10px_30px_-15px_rgba(23,87,168,0.25)]";

interface CommentFeedback {
  comment: string | null;
  filteredComment: string | null;
  commentCategory: string | null;
  commentFilterReason: string | null;
  commentHasProfanity: boolean;
  roundId?: string | null;
  createdAt?: string;
}

interface RoundInfo {
  id: string;
  week: number;
  label: string | null;
  status: string;
}

interface RadarAxis {
  label: string;
  value: number;
}

interface Props {
  courseId: string;
  aiSummaryCache?: string | null;
  courseName: string;
  semester: string;
  professorName: string;
  totalFeedbacks: number;
  studentCount: number | null;
  speedCounts: { verySlow?: number; slow: number; moderate: number; fast: number; veryFast?: number };
  comprehensionCounts: { high: number; medium: number; low: number };
  communicationAvg: number;
  communicationDist: number[];
  commentFeedbacks: CommentFeedback[];
  rounds?: RoundInfo[];
  radarAxes: RadarAxis[];
  categoryRadarAxes?: RadarAxis[];
  categoryName?: string;
  hideTitle?: boolean;
  showComments?: boolean;
  demoMode?: boolean;
}

function OverviewKpi({
  label,
  value,
  suffix,
  tone = "blue",
  sub,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  tone?: "navy" | "blue" | "green" | "amber" | "rose";
  sub?: string;
}) {
  const toneClass = {
    navy: "text-[#10233F]",
    blue: "text-[#1677FF]",
    green: "text-emerald-600",
    amber: "text-amber-500",
    rose: "text-rose-600",
  }[tone];

  return (
    <div className="relative min-h-[120px] overflow-hidden rounded-2xl border border-blue-100/80 bg-white/90 p-5 shadow-[0_10px_30px_-15px_rgba(23,87,168,0.25)]">
      <div className="absolute -right-9 -top-10 h-28 w-28 rounded-full bg-blue-500/5" />
      <p className="relative text-sm font-semibold text-slate-500">{label}</p>
      <p className={`relative mt-3 text-[34px] font-bold leading-none ${toneClass}`}>
        {value}
        {suffix ? <span className="ml-1 text-base font-normal text-slate-400">{suffix}</span> : null}
      </p>
      {sub ? (
        <p className="relative mt-2 text-xs font-medium text-slate-400">{sub}</p>
      ) : null}
    </div>
  );
}

function MetricBar({
  label,
  value,
  valueLabel,
  tone,
}: {
  label: string;
  value: number;
  valueLabel?: string;
  tone: "blue" | "green" | "amber" | "rose";
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const fillClass = {
    blue: "bg-gradient-to-r from-[#1677FF] to-[#38BDF8]",
    green: "bg-gradient-to-r from-emerald-500 to-teal-300",
    amber: "bg-gradient-to-r from-amber-400 to-yellow-300",
    rose: "bg-gradient-to-r from-rose-500 to-red-300",
  }[tone];

  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)_52px] items-center gap-3">
      <span className="text-sm font-semibold text-[#27496D]">{label}</span>
      <div className="h-2.5 overflow-hidden rounded-full bg-blue-50">
        <div className={`h-full rounded-full ${fillClass}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-right text-sm font-bold text-[#10233F]">
        {valueLabel ?? `${pct}%`}
      </span>
    </div>
  );
}

function percentTone(value: number): "blue" | "green" | "amber" | "rose" {
  if (value >= 75) return "blue";
  if (value >= 50) return "green";
  if (value >= 25) return "amber";
  return "rose";
}

function scoreTone(value: number): "blue" | "green" | "amber" | "rose" {
  if (value >= 4) return "blue";
  if (value >= 3.5) return "green";
  if (value >= 2.5) return "amber";
  return "rose";
}

function ResponseRateWarning({
  total,
  studentCount,
}: {
  total: number;
  studentCount: number | null;
}) {
  if (total === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm p-3 rounded-md">
        아직 피드백이 없습니다. 학생들에게 토큰 링크를 배포해주세요.
      </div>
    );
  }

  // 주차별 누적 응답이면 수강생 수 초과 가능 → 응답률 경고 미표시
  const rate =
    studentCount && studentCount > 0 && total <= studentCount
      ? Math.round((total / studentCount) * 100)
      : null;

  if (rate !== null && rate < 20) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 text-sm p-3 rounded-md">
        응답률이 {rate}%로 낮습니다 (수강생 {studentCount}명 중 {total}명
        응답). 해석에 주의가 필요합니다.
      </div>
    );
  }

  if (total < 5) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm p-3 rounded-md">
        응답 수가 {total}건으로 적습니다. 해석에 주의가 필요합니다.
      </div>
    );
  }

  return null;
}

export function FeedbackAnalysis({
  courseId,
  aiSummaryCache,
  courseName,
  semester,
  professorName,
  totalFeedbacks,
  studentCount,
  speedCounts,
  comprehensionCounts,
  communicationAvg,
  commentFeedbacks,
  rounds,
  radarAxes,
  categoryRadarAxes,
  categoryName,
  hideTitle = false,
  showComments = true,
  demoMode = false,
}: Props) {
  const isLowData = totalFeedbacks < 3;
  const responseRate = calcResponseRate(totalFeedbacks, studentCount);
  const speedModerateRatio =
    totalFeedbacks > 0 ? Math.round((speedCounts.moderate / totalFeedbacks) * 100) : 0;
  const comprehensionHighRatio =
    totalFeedbacks > 0 ? Math.round((comprehensionCounts.high / totalFeedbacks) * 100) : 0;
  const communicationRatio = Math.round((communicationAvg / 5) * 100);
  const axisValue = (label: string) => Math.round(radarAxes.find((axis) => axis.label === label)?.value ?? 0);
  const contentRatio = axisValue("내용 이해") || comprehensionHighRatio;
  const materialRatio = axisValue("자료·예시 도움");
  const communicationAxisRatio = axisValue("질문·소통 편의") || communicationRatio;
  const engagementRatio = axisValue("학습 몰입");
  const slowRatio =
    totalFeedbacks > 0
      ? Math.round((((speedCounts.verySlow ?? 0) + speedCounts.slow) / totalFeedbacks) * 100)
      : 0;
  const fastRatio =
    totalFeedbacks > 0
      ? Math.round(((speedCounts.fast + (speedCounts.veryFast ?? 0)) / totalFeedbacks) * 100)
      : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      {!hideTitle && (
        <div>
          <h1 className="text-2xl font-bold">{courseName}</h1>
          <p className="text-gray-500 text-sm">
            {professorName} 교수님 · {semester}
          </p>
        </div>
      )}

      {/* Student opinion summary */}
      <Card className={`${V3_CARD} bg-gradient-to-br from-white via-white to-blue-50/60`}>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base text-[#10233F]">학생 의견 요약</CardTitle>
              <CardDescription className="text-slate-500">
                차트보다 먼저 학생 의견의 흐름을 문장으로 확인합니다.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="border border-blue-100 bg-blue-50/80 text-[#0F5FD7]">
              익명 집계
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 rounded-[20px] border border-sky-200/50 bg-gradient-to-br from-sky-50/80 to-white/90 p-5 sm:grid-cols-[54px_minmax(0,1fr)]">
            <div className="grid h-[54px] w-[54px] place-items-center rounded-[18px] bg-gradient-to-br from-[#1677FF] to-[#38BDF8] text-sm font-black text-white shadow-[0_12px_24px_rgba(22,119,255,0.22)]">
              요약
            </div>
            <div>
              {!isLowData ? (
                <AiSummaryLine
                  courseId={courseId}
                  initialSummary={aiSummaryCache}
                  demoMode={demoMode}
                />
              ) : (
                <p className="text-base leading-7 text-[#27496D]">
                  피드백이 더 쌓이면 이번 주차 학생 의견의 흐름을 문장으로 정리해 보여줍니다.
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {responseRate !== null ? (
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700">
                    수강생 {studentCount}명 중 {totalFeedbacks}명 응답 ({responseRate}%)
                  </span>
                ) : studentCount ? (
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700">
                    응답 {totalFeedbacks}건 · 수강생 {studentCount}명
                  </span>
                ) : (
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700">
                    응답 {totalFeedbacks}건
                  </span>
                )}
                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                  개인 식별 정보 미포함
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600">
                  강의 범위 내 정리
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ResponseRateWarning total={totalFeedbacks} studentCount={studentCount} />

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <OverviewKpi
          label="총 응답"
          value={totalFeedbacks}
          suffix="건"
          tone="navy"
          sub={studentCount ? `수강생 ${studentCount}명${responseRate !== null ? ` 중 ${responseRate}%` : ""}` : undefined}
        />
        <OverviewKpi label="내용 이해" value={Math.round(contentRatio)} suffix="%" tone={percentTone(contentRatio)} />
        <OverviewKpi label="자료·예시 도움" value={Math.round(materialRatio)} suffix="%" tone={percentTone(materialRatio)} />
        <OverviewKpi label="질문·소통 편의" value={communicationAvg} suffix="/ 5" tone={scoreTone(communicationAvg)} />
      </div>

      {/* Radar chart */}
      {totalFeedbacks > 0 && radarAxes.length >= 4 && (
        <div className={`space-y-5 ${isLowData ? "opacity-50" : ""}`}>
          <Card className={V3_CARD}>
            <CardHeader>
              <CardTitle className="text-base text-[#10233F]">주요 지표 흐름</CardTitle>
              <CardDescription className="text-slate-500">
                레이더 차트는 전체 인상 확인용입니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadarChart
                axes={radarAxes}
                compareAxes={categoryRadarAxes}
                compareLabel={categoryName ? `${categoryName} 분야 평균` : "유사 분야 평균"}
              />
            </CardContent>
          </Card>

          <Card className={V3_CARD}>
            <CardHeader>
              <CardTitle className="text-base text-[#10233F]">세부 응답 분포</CardTitle>
              <CardDescription className="text-slate-500">
                실제 판단은 수치와 막대 분포로 보완합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <MetricBar label="내용 이해" value={contentRatio} tone={percentTone(contentRatio)} />
              <MetricBar label="자료·예시" value={materialRatio} tone={percentTone(materialRatio)} />
              <MetricBar
                label="소통 편의"
                value={communicationAxisRatio}
                valueLabel={`${communicationAvg}/5`}
                tone={percentTone(communicationAxisRatio)}
              />
              <MetricBar
                label="학습 몰입"
                value={engagementRatio}
                tone={percentTone(engagementRatio)}
              />
              <MetricBar
                label="적정 속도"
                value={speedModerateRatio}
                valueLabel={`${speedModerateRatio}%`}
                tone={percentTone(speedModerateRatio)}
              />
              <div className="grid gap-2 pt-1 text-xs font-semibold text-slate-500 sm:grid-cols-3">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-center">느림 응답 {slowRatio}%</span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-center">적정 응답 {speedModerateRatio}%</span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-center">빠름 응답 {fastRatio}%</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {isLowData && totalFeedbacks > 0 && (
        <p className="text-sm text-slate-400 text-center">
          데이터가 부족하여 위 분석 결과가 흐리게 표시됩니다. 응답이 더
          쌓이면 정상적으로 표시됩니다.
        </p>
      )}

      {showComments ? (
        <CommentsSection commentFeedbacks={commentFeedbacks} rounds={rounds} demoMode={demoMode} />
      ) : null}
    </div>
  );
}

function AiSummaryLine({
  courseId,
  initialSummary,
  demoMode = false,
}: {
  courseId: string;
  initialSummary?: string | null;
  demoMode?: boolean;
}) {
  const [summary, setSummary] = useState<string | null>(
    demoMode ? (initialSummary ?? DEMO_COMMENT_SUMMARY) : (initialSummary ?? null)
  );
  const [loading, setLoading] = useState(!initialSummary && !demoMode);

  useEffect(() => {
    if (demoMode) return;
    if (initialSummary) return;
    generateRadarSummary(courseId)
      .then((res) => { if (res.success && res.summary) setSummary(res.summary); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [courseId, initialSummary, demoMode]);

  if (loading) {
    return (
      <p className="animate-pulse text-base leading-7 text-slate-400">
        학생 의견을 요약하고 있습니다...
      </p>
    );
  }

  if (!summary) return null;

  return (
    <p className="text-base leading-7 text-[#27496D]">{summary}</p>
  );
}

function CommentItem({ item }: { item: CommentFeedback }) {
  const displayText = item.filteredComment ?? item.comment;
  if (!displayText) return null;

  return (
    <li className="rounded-[17px] border border-blue-100/70 bg-white/75 p-3.5">
      <p className="text-sm font-semibold leading-relaxed text-[#27496D]">{displayText}</p>
    </li>
  );
}

export function CommentsSection({
  commentFeedbacks,
  rounds = [],
  demoMode = false,
}: {
  commentFeedbacks: CommentFeedback[];
  rounds?: RoundInfo[];
  demoMode?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [sortMode, setSortMode] = useState<"newest" | "oldest" | "longest" | "shortest">("newest");

  // 전체 요약 (펼친 상태 상단)
  const [summary, setSummary] = useState<string | null>(demoMode ? DEMO_COMMENT_SUMMARY : null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // 전주차 요약 (접힌 상태)
  const [prevSummary, setPrevSummary] = useState<string | null>(demoMode ? DEMO_COMMENT_SUMMARY : null);
  const [prevSummaryLoading, setPrevSummaryLoading] = useState(false);

  // commentCategory는 의미 분류로 신뢰하지 않음. 표시 가능한 익명 의견만 나열.
  const visibleComments = commentFeedbacks.filter(
    (cf) => Boolean((cf.filteredComment ?? cf.comment)?.trim())
  );
  const sortedComments = [...visibleComments].sort((a, b) => {
    const aText = (a.filteredComment ?? a.comment ?? "").trim();
    const bText = (b.filteredComment ?? b.comment ?? "").trim();
    if (sortMode === "longest") return bText.length - aText.length;
    if (sortMode === "shortest") return aText.length - bText.length;
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return sortMode === "oldest" ? aTime - bTime : bTime - aTime;
  });
  const total = visibleComments.length;
  const previewComments = sortedComments.slice(0, 2);

  // 현재 진행 중인 라운드의 바로 전 주차 계산
  const sortedRounds = [...rounds].sort((a, b) => a.week - b.week);
  const activeIdx = sortedRounds.findIndex((r) => r.status === "active");
  const prevRound = activeIdx > 0 ? sortedRounds[activeIdx - 1] : null;

  // 주차별 그룹핑 (전주차 요약 대상 계산용)
  const byRound = new Map<string | null, CommentFeedback[]>();
  for (const cf of visibleComments) {
    const key = cf.roundId ?? null;
    if (!byRound.has(key)) byRound.set(key, []);
    byRound.get(key)!.push(cf);
  }

  const prevRoundComments = prevRound ? (byRound.get(prevRound.id) ?? []) : [];
  const hasPrevRound = prevRound !== null && prevRoundComments.length > 0;
  const prevRoundLabel = prevRound ? (prevRound.label ?? `${prevRound.week}주차`) : null;

  const runSummarize = () => {
    if (total === 0 || summaryLoading) return;
    if (demoMode) {
      setSummary(DEMO_COMMENT_SUMMARY);
      return;
    }
    setSummaryLoading(true);
    const texts = visibleComments.map((cf) => cf.filteredComment ?? cf.comment ?? "").filter(Boolean);
    summarizeComments(texts)
      .then((res) => { setSummary(res.summary); })
      .catch(() => {})
      .finally(() => setSummaryLoading(false));
  };

  const runPrevSummarize = () => {
    if (prevRoundComments.length === 0 || prevSummaryLoading) return;
    if (demoMode) {
      setPrevSummary(DEMO_COMMENT_SUMMARY);
      return;
    }
    setPrevSummaryLoading(true);
    const texts = prevRoundComments.map((cf) => cf.filteredComment ?? cf.comment ?? "").filter(Boolean);
    summarizeComments(texts)
      .then((res) => { setPrevSummary(res.summary); })
      .catch(() => {})
      .finally(() => setPrevSummaryLoading(false));
  };

  // 마운트 시: 전주차 요약 우선 로드, 없으면 전체 요약 로드
  useEffect(() => {
    if (total === 0) return;
    if (hasPrevRound) {
      runPrevSummarize();
    } else {
      runSummarize();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 펼칠 때 전체 요약 로드
  useEffect(() => {
    if (!open || total === 0) return;
    if (!summary && !summaryLoading) runSummarize();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Card className={V3_CARD}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base text-[#10233F]">
              {open ? "학생 의견" : "대표 학생 의견"}
            </CardTitle>
            <CardDescription className="text-slate-500">학생들이 남긴 의견 ({total}건)</CardDescription>
          </div>
          {total > 0 && (
            <button
              onClick={() => setOpen((v) => !v)}
              className="text-xs text-slate-400 hover:text-[#0F5FD7] underline underline-offset-2 mt-1 shrink-0"
            >
              {open ? "접기" : "펼치기"}
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {total === 0 ? (
          <p className="text-slate-400 text-sm">남겨진 의견이 없습니다.</p>
        ) : open ? (
          <div className="space-y-4">
            {/* 전체 요약 */}
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-white/80 px-3 py-2">
              <span className="text-xs font-bold text-slate-500">정렬</span>
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as typeof sortMode)}
                className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-[#27496D] outline-none transition focus:border-blue-300"
              >
                <option value="newest">최신순</option>
                <option value="oldest">오래된 순</option>
                <option value="longest">글자수 많은 순</option>
                <option value="shortest">글자수 적은 순</option>
              </select>
            </div>
            {(summaryLoading || summary) && (
              <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-[#27496D] leading-relaxed">
                {summaryLoading ? (
                  <p className="text-slate-400">AI 요약 생성 중...</p>
                ) : (
                  <p>{summary}</p>
                )}
              </div>
            )}
            <ul className="space-y-3">
              {sortedComments.map((item, i) => (
                <CommentItem key={`c-${i}`} item={item} />
              ))}
            </ul>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-3">
              {previewComments.map((item, index) => (
                <div
                  key={`preview-${index}`}
                  className="rounded-[17px] border border-blue-100/70 bg-white/75 p-3.5"
                >
                  <p className="text-sm font-semibold leading-relaxed text-[#27496D]">
                    {item.filteredComment ?? item.comment}
                  </p>
                  <p className="mt-2 text-xs font-bold text-slate-400">
                    {hasPrevRound ? prevRoundLabel : "현재 라운드"} 의견
                  </p>
                </div>
              ))}
            </div>
            <button
              onClick={() => setOpen(true)}
              className="flex min-h-10 w-full items-center justify-center rounded-[13px] border border-blue-100 bg-white/90 px-3 text-sm font-bold text-[#27496D] shadow-[0_7px_18px_rgba(15,35,63,0.04)] hover:bg-blue-50 hover:text-[#0F5FD7]"
            >
              전체 의견 보기
            </button>
            {(summaryLoading || summary || prevSummaryLoading || prevSummary) && (
              <button
                onClick={hasPrevRound ? runPrevSummarize : runSummarize}
                className="text-xs font-medium text-[#1677FF] hover:text-[#0F5FD7]"
              >
                ↻ 의견 요약 다시 보기
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
