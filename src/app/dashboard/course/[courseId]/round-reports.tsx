"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { saveImprovementNote } from "@/app/actions/improvement-notes";
import { generateClassChecklist, type ClassChecklist } from "@/app/actions/class-checklist";
import { summarizeComments } from "@/app/actions/filter-comments";
import type { SignificantChange, SemesterComparison, RoundReportsResult, RoundMaterialSummary, RoundComment } from "@/app/actions/round-reports";
import { DEMO_CLASS_CHECKLIST, DEMO_COMMENT_SUMMARY } from "@/lib/demo-ai-fixtures";
import {
  displayMaterialMetricValue,
  materialMetricStyle,
} from "@/lib/material-analysis-style";

const V3_CARD =
  "ring-0 border-blue-100 bg-white/90 shadow-[0_10px_30px_-15px_rgba(23,87,168,0.25)]";

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function formatCommentDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}

function CommentBody({ text }: { text: string }) {
  const segments = text
    .split(/(?=좋았던 점\s*:|아쉬웠던 점\s*:|어려웠던 점\s*:)/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      if (/^좋았던 점\s*:/.test(s)) {
        return { kind: "positive" as const, body: s.replace(/^좋았던 점\s*:\s*/, "") };
      }
      if (/^(아쉬웠던 점|어려웠던 점)\s*:/.test(s)) {
        return { kind: "difficulty" as const, body: s.replace(/^(아쉬웠던 점|어려웠던 점)\s*:\s*/, "") };
      }
      return { kind: "other" as const, body: s };
    });

  if (!segments.some((s) => s.kind !== "other")) {
    return <p>{text}</p>;
  }

  return (
    <div className="space-y-1.5">
      {segments.map((seg, index) =>
        seg.kind === "positive" ? (
          <p key={index}>
            <span className="font-extrabold text-[#1677FF]">좋았던 점</span> {seg.body}
          </p>
        ) : seg.kind === "difficulty" ? (
          <p key={index}>
            <span className="font-extrabold text-red-600">아쉬웠던 점</span> {seg.body}
          </p>
        ) : (
          <p key={index}>{seg.body}</p>
        )
      )}
    </div>
  );
}

// 라운드별 학생 의견: 접으면 AI 요약, 펼치면 전체 의견
function RoundComments({
  comments,
  demoMode,
  cachedSummary,
  onSummary,
}: {
  comments: RoundComment[];
  demoMode: boolean;
  cachedSummary: string | null;
  onSummary: (summary: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<string | null>(cachedSummary);
  const [loading, setLoading] = useState(false);

  // 마운트 시 자동으로 요약 생성 — 이미 캐시된 요약이 있으면 재호출하지 않음
  useEffect(() => {
    if (summary || loading || comments.length === 0) return;
    if (demoMode) {
      setSummary(DEMO_COMMENT_SUMMARY);
      onSummary(DEMO_COMMENT_SUMMARY);
      return;
    }
    setLoading(true);
    summarizeComments(comments.map((comment) => comment.text))
      .then((res) => {
        if (res.summary) {
          setSummary(res.summary);
          onSummary(res.summary);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mt-3 rounded-2xl border border-blue-100 bg-white/80 p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-extrabold text-[#10233F]">
          {open ? `학생 의견 (${comments.length}건)` : "학생 의견 요약"}
        </p>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 text-xs font-bold text-slate-400 underline underline-offset-2 hover:text-[#0F5FD7]"
        >
          {open ? "접기" : "펼치기"}
        </button>
      </div>

      {open ? (
        <ul className="mt-2 space-y-2">
          {comments.map((comment, index) => (
            <li
              key={index}
              className="rounded-xl bg-blue-50/45 px-3 py-2 text-xs font-medium leading-5 text-[#27496D]"
            >
              <p className="mb-1 text-right text-[10px] font-bold text-slate-400">
                {formatCommentDate(comment.createdAt)}
              </p>
              <CommentBody text={comment.text} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-2">
          {loading ? (
            <p className="animate-pulse text-xs font-medium leading-5 text-slate-400">
              AI 요약 생성 중...
            </p>
          ) : summary ? (
            <p className="text-xs font-medium leading-5 text-[#27496D]">{summary}</p>
          ) : (
            <p className="text-xs font-medium leading-5 text-slate-400">
              요약할 의견이 충분하지 않습니다. 펼치기를 눌러 전체 의견을 확인하세요.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  suffix = "",
  caption,
  tone,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  caption?: string;
  tone: "blue" | "green" | "amber" | "rose";
}) {
  const toneClass = {
    blue: "border-blue-200 bg-blue-50/80 text-[#0F5FD7]",
    green: "border-emerald-200 bg-emerald-50/80 text-emerald-700",
    amber: "border-amber-200 bg-amber-50/85 text-amber-700",
    rose: "border-rose-200 bg-rose-50/85 text-rose-700",
  }[tone];

  return (
    <div className={`min-w-0 rounded-2xl border px-3 py-2.5 text-center ${toneClass}`}>
      <div className="whitespace-nowrap text-[11px] font-bold text-slate-600">{label}</div>
      <div className="mt-0.5 text-lg font-extrabold">
        {value}
        <span className="ml-0.5 text-xs font-semibold opacity-70">{suffix}</span>
      </div>
      {caption && <p className="mt-0.5 text-[10px] leading-tight text-slate-400">{caption}</p>}
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

function CompareRow({ label, prev, curr, unit }: { label: string; prev: number; curr: number; unit: string }) {
  const delta = unit === "점"
    ? Math.round((curr - prev) * 10) / 10
    : Math.round(curr - prev);
  const isPos = delta > 0;
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span>
        <span className="text-gray-400">{prev}{unit}</span>
        <span className="mx-1 text-gray-300">→</span>
        <span className="font-medium">{curr}{unit}</span>
        <span className={`ml-1 text-xs ${isPos ? "text-green-600" : delta < 0 ? "text-red-500" : "text-gray-400"}`}>
          ({isPos ? "+" : ""}{delta}{unit})
        </span>
      </span>
    </div>
  );
}

function lsKey(courseId: string, roundId: string | null) {
  return `note-dismissed-${courseId}-${roundId ?? "semester"}`;
}

function loadDismissed(courseId: string, roundId: string | null): string[] {
  try {
    const raw = localStorage.getItem(lsKey(courseId, roundId));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveDismissed(courseId: string, roundId: string | null, axes: string[]) {
  try {
    localStorage.setItem(lsKey(courseId, roundId), JSON.stringify(axes));
  } catch {}
}

function NotePrompt({
  courseId,
  roundId,
  changes,
  alreadySubmittedAxes,
}: {
  courseId: string;
  roundId: string | null;
  changes: SignificantChange[];
  alreadySubmittedAxes: string[];
}) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState<string[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDismissed(loadDismissed(courseId, roundId));
  }, [courseId, roundId]);

  const pending = changes.filter(
    (c) => !alreadySubmittedAxes.includes(c.axis) && !dismissed.includes(c.axis)
  );
  const remaining = pending.filter((c) => !submitted.includes(c.axis));
  if (remaining.length === 0) return null;

  async function handleSubmit(change: SignificantChange) {
    const note = notes[change.axis] ?? "";
    if (!note.trim()) { setError("내용을 입력해주세요."); return; }
    setLoading(change.axis);
    setError(null);
    try {
      const result = await saveImprovementNote(courseId, roundId, change.axis, change.delta, note);
      if (result.success) {
        setSubmitted((prev) => [...prev, change.axis]);
      } else {
        setError(result.error ?? "저장 실패");
      }
    } catch {
      setError("저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(null);
    }
  }

  function handleDismiss(axis: string) {
    const next = [...dismissed, axis];
    setDismissed(next);
    saveDismissed(courseId, roundId, next);
  }

  return (
    <div className="mt-3 space-y-3">
      {remaining.map((change) => (
        <div key={change.axis} className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
          <p className="text-sm font-medium text-amber-800">
            ✨ <strong>{change.label}</strong>이(가){" "}
            <span className="text-green-700">
              +{change.axis === "communication" ? `${change.delta}점` : `${change.delta}%`}
            </span>{" "}
            올랐어요!
          </p>
          <p className="text-xs text-amber-700">
            혹시 바꾼 점이 있으신가요? 익명으로 다른 교수님들과 공유됩니다. (선택사항)
          </p>
          <Textarea
            placeholder="예: 수업 중간에 질의응답 시간을 5분 추가했습니다."
            rows={2}
            value={notes[change.axis] ?? ""}
            onChange={(e) => setNotes((prev) => ({ ...prev, [change.axis]: e.target.value }))}
            className="text-sm"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={() => handleSubmit(change)} disabled={loading === change.axis}>
              {loading === change.axis ? "저장 중..." : "공유하기"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handleDismiss(change.axis)} disabled={loading === change.axis}>
              다시 보지 않기
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

const PRIORITY_META = {
  urgent: { label: "필수", className: "bg-red-100 text-red-700" },
  important: { label: "권장", className: "bg-orange-100 text-orange-700" },
  optional: { label: "선택", className: "bg-gray-100 text-gray-600" },
} as const;

const CATEGORY_META = {
  content: { label: "내용", color: "text-blue-600" },
  pace: { label: "속도", color: "text-orange-600" },
  communication: { label: "소통", color: "text-green-600" },
  material: { label: "자료", color: "text-purple-600" },
} as const;

function clsKey(courseId: string, roundId: string) {
  return `checklist-done-${courseId}-${roundId}`;
}

function loadChecked(courseId: string, roundId: string): Set<number> {
  try {
    const raw = localStorage.getItem(clsKey(courseId, roundId));
    return raw ? new Set(JSON.parse(raw) as number[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveChecked(courseId: string, roundId: string, checked: Set<number>) {
  try {
    localStorage.setItem(clsKey(courseId, roundId), JSON.stringify([...checked]));
  } catch {}
}

function ClassChecklistPanel({
  courseId,
  roundId,
  demoMode = false,
}: {
  courseId: string;
  roundId: string;
  demoMode?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [checklist, setChecklist] = useState<ClassChecklist | null>(
    demoMode ? DEMO_CLASS_CHECKLIST : null
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generated, setGenerated] = useState(demoMode);
  const [checked, setChecked] = useState<Set<number>>(new Set());

  useEffect(() => {
    setChecked(loadChecked(courseId, roundId));
  }, [courseId, roundId]);

  function toggleChecked(i: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      saveChecked(courseId, roundId, next);
      return next;
    });
  }

  async function handleGenerate() {
    setLoading(true);
    setErrorMsg(null);
    if (demoMode) {
      setChecklist(DEMO_CLASS_CHECKLIST);
      setGenerated(true);
      setLoading(false);
      return;
    }
    try {
      const res = await generateClassChecklist(courseId, roundId);
      if (res.success && res.result) {
        setChecklist(res.result);
        setGenerated(true);
        // 재생성 시 체크 초기화
        const empty = new Set<number>();
        setChecked(empty);
        saveChecked(courseId, roundId, empty);
      } else {
        setErrorMsg(res.error ?? "생성 실패");
      }
    } catch {
      setErrorMsg("요청 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  if (!generated) {
    return (
      <div className="mt-3 space-y-1">
        <Button
          size="sm"
          variant="outline"
          onClick={handleGenerate}
          disabled={loading}
          className="text-xs"
        >
          {loading ? "생성 중..." : "AI 다음 수업 준비 체크리스트 생성"}
        </Button>
        {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}
      </div>
    );
  }

  if (!checklist) return null;

  const total = checklist.items.length;
  const doneCount = checklist.items.filter((_, i) => checked.has(i)).length;
  const allDone = doneCount === total;

  // priority order: urgent → important → optional
  const priorityOrder = { urgent: 0, important: 1, optional: 2 };
  const sortedItems = [...checklist.items]
    .map((item, originalIdx) => ({ item, originalIdx }))
    .sort((a, b) => priorityOrder[a.item.priority] - priorityOrder[b.item.priority]);

  return (
    <div className="mt-3 border border-indigo-100 rounded-lg bg-indigo-50/30 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-indigo-800">AI 다음 수업 준비 체크리스트</p>
          {allDone ? (
            <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
              완료
            </span>
          ) : (
            <span className="text-[10px] text-indigo-400">
              {doneCount}/{total} 완료
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleGenerate}
          disabled={loading}
          className="text-xs h-6 px-2 text-indigo-500 hover:text-indigo-700"
        >
          {loading ? "생성 중..." : "재생성"}
        </Button>
      </div>

      {allDone && (
        <div className="mb-3 p-2 bg-green-50 border border-green-100 rounded-lg text-xs text-green-700 text-center">
          모든 항목을 확인했습니다. 다음 수업도 잘 준비되었어요!
        </div>
      )}

      <div className="space-y-2">
        {sortedItems.map(({ item, originalIdx }) => {
          const done = checked.has(originalIdx);
          return (
            <div
              key={originalIdx}
              onClick={() => toggleChecked(originalIdx)}
              className={`flex gap-2 text-xs cursor-pointer rounded-md p-1.5 -mx-1.5 transition-colors ${done ? "opacity-50" : "hover:bg-indigo-50"}`}
            >
              {/* 체크박스 */}
              <div className="shrink-0 mt-0.5">
                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${done ? "bg-indigo-500 border-indigo-500" : "border-gray-300"}`}>
                  {done && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <div className="flex-1 space-y-0.5">
                <div className="flex items-center gap-1 flex-wrap">
                  <Badge className={`${PRIORITY_META[item.priority].className} text-[10px] px-1 py-0`}>
                    {PRIORITY_META[item.priority].label}
                  </Badge>
                  <span className={`font-medium ${CATEGORY_META[item.category].color}`}>
                    {CATEGORY_META[item.category].label}
                  </span>
                </div>
                <p className={`${done ? "line-through text-gray-400" : "text-gray-800"}`}>{item.action}</p>
                <p className="text-gray-400">{item.reason}</p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-indigo-600 border-t border-indigo-100 pt-2">
        {checklist.encouragement}
      </p>
    </div>
  );
}

type RoundStatsForCorr = {
  comprehensionHigh: number;
  practiceAvg: number | null;
  speedModerate: number;
} | null;

type Correlation = { text: string; type: "warn" | "ok" | "info" };

function getCorrelations(mat: RoundMaterialSummary, rs: NonNullable<RoundStatsForCorr>): Correlation[] {
  const corrs: Correlation[] = [];
  if (mat.difficulty === "상" && rs.comprehensionHigh < 50)
    corrs.push({ text: `자료 난이도 높음 + 내용 이해 ${rs.comprehensionHigh}%: 설명 단계 보완 참고`, type: "warn" });
  if (mat.difficulty === "하" && rs.comprehensionHigh >= 70)
    corrs.push({ text: `자료 난이도 낮음 + 내용 이해 ${rs.comprehensionHigh}%: 현재 난이도 유지 가능`, type: "ok" });
  if ((mat.exampleSufficiency === "부족" || mat.exampleSufficiency === "보완 필요") && rs.practiceAvg !== null && rs.practiceAvg < 3.5)
    corrs.push({ text: `예시 보완 필요 + 실습·예시 도움 ${rs.practiceAvg}/5: 예시 추가 검토 신호`, type: "warn" });
  if (mat.termDensity === "높음" && rs.speedModerate < 50)
    corrs.push({ text: `전문 용어 밀도 높음 + 적정 속도 응답 ${rs.speedModerate}%: 용어 도입 속도 확인`, type: "info" });
  if (mat.exampleSufficiency === "충분" && rs.practiceAvg !== null && rs.practiceAvg >= 4.0)
    corrs.push({ text: `예시 충분 + 실습·예시 도움 ${rs.practiceAvg}/5: 자료 예시 강점`, type: "ok" });
  return corrs;
}

function splitSuggestion(text: string) {
  const match = text.match(/\s*\(([^()]+)\)\s*$/);
  if (!match) return { body: text, evidence: null as string | null };
  return {
    body: text.slice(0, match.index).trim(),
    evidence: match[1],
  };
}

function SuggestionLine({
  label,
  text,
  className,
}: {
  label: string;
  text: string;
  className: string;
}) {
  const suggestion = splitSuggestion(text);
  return (
    <div className="flex gap-1.5 text-xs">
      <span className={`shrink-0 font-medium ${className}`}>{label}</span>
      <span className="text-gray-500">
        <span>{suggestion.body}</span>
        {suggestion.evidence && (
          <span className="mt-0.5 block text-[11px] font-medium text-slate-400">
            근거 기법: {suggestion.evidence}
          </span>
        )}
      </span>
    </div>
  );
}

function MaterialBadge({
  label,
  value,
  kind,
}: {
  label: string;
  value: string;
  kind: "difficulty" | "term" | "example";
}) {
  const style = materialMetricStyle(kind, value);
  return (
    <Badge className={`${style.badge} text-xs`}>
      {label} {displayMaterialMetricValue(kind, value)}
    </Badge>
  );
}

function MaterialsSection({
  materials,
  roundStats,
}: {
  materials: RoundMaterialSummary[];
  roundStats: RoundStatsForCorr;
}) {
  const correlationsPerMat = materials.map((mat) =>
    roundStats ? getCorrelations(mat, roundStats) : []
  );
  const hasAnyCorrelation = correlationsPerMat.some((c) => c.length > 0);

  const [open, setOpen] = useState(hasAnyCorrelation);

  if (materials.length === 0) return null;

  const analyzed = materials.filter((m) => m.difficulty !== null);

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 transition-colors"
      >
        <svg
          className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        강의자료와 학생 반응 함께 보기
        <span className="text-gray-400">(분석 완료 {analyzed.length}/{materials.length})</span>
        {hasAnyCorrelation && (
          <span className="ml-1 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
            학생 반응 연결
          </span>
        )}
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          <p className="rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2 text-xs leading-5 text-[#27496D]">
            해당 회차 학생 반응과 업로드 자료 분석을 나란히 놓고 보는 참고 영역입니다. 아래 신호는 곱셈이나 점수가 아니라, 자료 분석 결과와 학생 응답이 같은 방향을 가리키는지 보여줍니다.
          </p>
          {materials.map((mat, idx) => {
            const corrs = correlationsPerMat[idx];
            const hasWarn = corrs.some((c) => c.type === "warn");
            return (
              <div
                key={mat.id}
                className={`border rounded-lg p-3 ${hasWarn ? "border-amber-200 bg-amber-50/40" : "border-gray-100 bg-gray-50/50"}`}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-medium text-gray-700 truncate max-w-[200px]">
                    {mat.fileName}
                  </span>
                  {mat.difficulty ? (
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      <MaterialBadge label="난이도" value={mat.difficulty} kind="difficulty" />
                      {mat.exampleSufficiency && (
                        <MaterialBadge label="예시 충분도" value={mat.exampleSufficiency} kind="example" />
                      )}
                      {mat.termDensity && (
                        <MaterialBadge label="전문 용어 밀도" value={mat.termDensity} kind="term" />
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 shrink-0">분석 전</span>
                  )}
                </div>

                {/* 피드백 상관관계 태그 */}
                {corrs.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {corrs.map((c, i) => (
                      <span
                        key={i}
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          c.type === "warn"
                            ? "bg-red-100 text-red-700"
                            : c.type === "ok"
                              ? "bg-green-100 text-green-700"
                              : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {c.text}
                      </span>
                    ))}
                  </div>
                )}

                {mat.difficultyReason && (
                  <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                    {mat.difficultyReason}
                  </p>
                )}

                {mat.improvements && (mat.improvements.structure || mat.improvements.examples || mat.improvements.pedagogy) && (
                  <div className="mt-2 space-y-1 border-t border-gray-100 pt-2">
                    {mat.improvements.structure && (
                      <SuggestionLine label="구조" text={mat.improvements.structure} className="text-blue-600" />
                    )}
                    {mat.improvements.examples && (
                      <SuggestionLine label="예시" text={mat.improvements.examples} className="text-green-600" />
                    )}
                    {mat.improvements.pedagogy && (
                      <SuggestionLine label="교수법" text={mat.improvements.pedagogy} className="text-purple-600" />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SemesterCard({ courseId, sem }: { courseId: string; sem: SemesterComparison }) {
  return (
    <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">학기 전체 결산</span>
          <Badge className="bg-blue-100 text-blue-700 text-xs">{sem.currentSemester}</Badge>
        </div>
        <span className="text-xs text-gray-500">{sem.comparisonLabel}</span>
      </div>

      <div className="bg-white rounded-lg p-3 space-y-2">
        <CompareRow label="질문·소통 편의" prev={sem.prev.communicationAvg} curr={sem.curr.communicationAvg} unit="점" />
        <CompareRow label="내용 이해 4점 이상" prev={sem.prev.comprehensionHigh} curr={sem.curr.comprehensionHigh} unit="%" />
        <CompareRow label="적정 속도 응답" prev={sem.prev.speedModerate} curr={sem.curr.speedModerate} unit="%" />
      </div>

      <p className="text-xs text-gray-400 mt-2">
        {sem.prevSemester} {sem.prev.totalFeedbacks}건 → {sem.currentSemester} {sem.curr.totalFeedbacks}건
      </p>

      {sem.significantChanges.length > 0 && (
        <NotePrompt
          courseId={courseId}
          roundId={null}
          changes={sem.significantChanges}
          alreadySubmittedAxes={sem.submittedNoteAxes}
        />
      )}
    </div>
  );
}

interface Props {
  courseId: string;
  data: RoundReportsResult;
  demoMode?: boolean;
}

export function RoundReports({ courseId, data, demoMode = false }: Props) {
  const { rounds, currentSemester, semesterComparison } = data;
  const hasRounds = rounds.length > 0;
  const hasSemester = semesterComparison !== null;
  // 라운드별 학생 의견 AI 요약 캐시 (리렌더 시 재생성 방지)
  const [commentSummaries, setCommentSummaries] = useState<Record<string, string>>({});

  if (!hasRounds && !hasSemester) {
    return (
      <Card className={V3_CARD}>
        <CardHeader>
          <CardTitle className="text-base text-[#10233F]">주차별 리포트</CardTitle>
          <CardDescription className="text-slate-500">종료된 라운드가 없습니다. 라운드가 종료되면 여기에 요약이 표시됩니다.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={V3_CARD}>
      <CardHeader>
        <CardTitle className="text-base text-[#10233F]">주차별 리포트</CardTitle>
        <CardDescription className="text-slate-500">각 라운드 종료 시점의 응답 요약과 학생 의견입니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 학기 전체 결산 */}
        {hasSemester ? (
          <SemesterCard courseId={courseId} sem={semesterComparison} />
        ) : (
          <div className="border border-blue-100 rounded-[18px] bg-white/75 p-4 text-center text-sm text-slate-400">
            <p className="font-medium text-gray-500 mb-1">
              학기 전체 결산 <Badge className="bg-gray-100 text-gray-500 text-xs ml-1">{currentSemester}</Badge>
            </p>
            이전 학기 데이터가 없어 비교할 수 없습니다.
          </div>
        )}

        {hasRounds && <Separator />}

        {/* 주차별 리포트 */}
        {rounds.map((r, idx) => (
          <div key={r.id} className="border border-blue-100 rounded-[18px] bg-white/75 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{r.label ?? `${r.week}주차`}</span>
                <Badge className="bg-gray-100 text-gray-600 text-xs">종료</Badge>
                <span className="text-xs text-gray-400">{formatDate(r.endDate)} 종료</span>
              </div>
              <span className="text-xs text-gray-500">
                응답 {r.totalFeedbacks}건 · 제출자 {r.submissionCount}명
              </span>
            </div>

            {r.totalFeedbacks === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2">응답 없음</p>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(142px,1fr))] gap-2.5">
                <Stat
                  label="적정 속도 응답"
                  value={r.speedModerate}
                  suffix="%"
                  caption="‘적당해요’ 선택 비율"
                  tone={percentTone(r.speedModerate)}
                />
                <Stat
                  label="내용 이해 4점 이상"
                  value={r.comprehensionHigh}
                  suffix="%"
                  caption="4~5점 응답 비율"
                  tone={percentTone(r.comprehensionHigh)}
                />
                <Stat
                  label="질문·소통 평균"
                  value={r.communicationAvg}
                  suffix="/5"
                  caption="질문 편의 평균"
                  tone={scoreTone(r.communicationAvg)}
                />
                {r.interestAvg !== null && (
                  <Stat
                    label="학습 몰입 평균"
                    value={r.interestAvg}
                    suffix="/5"
                    caption="몰입도 평균"
                    tone={scoreTone(r.interestAvg)}
                  />
                )}
                {r.assignmentAvg !== null && (
                  <Stat
                    label="과제 적절성 평균"
                    value={r.assignmentAvg}
                    suffix="/5"
                    caption="과제 난이도·분량"
                    tone={scoreTone(r.assignmentAvg)}
                  />
                )}
                {r.practiceAvg !== null && (
                  <Stat
                    label="실습 도움 평균"
                    value={r.practiceAvg}
                    suffix="/5"
                    caption="실습·예시 도움"
                    tone={scoreTone(r.practiceAvg)}
                  />
                )}
              </div>
            )}

            {r.comments.length > 0 && (
              <RoundComments
                comments={r.comments}
                demoMode={demoMode}
                cachedSummary={commentSummaries[r.id] ?? null}
                onSummary={(text) =>
                  setCommentSummaries((prev) => ({ ...prev, [r.id]: text }))
                }
              />
            )}

            <MaterialsSection
              materials={r.materials}
              roundStats={r.totalFeedbacks > 0 ? {
                comprehensionHigh: r.comprehensionHigh,
                practiceAvg: r.practiceAvg,
                speedModerate: r.speedModerate,
              } : null}
            />

            {/* 가장 최신 라운드에만 체크리스트 표시 */}
            {idx === 0 && r.totalFeedbacks >= 3 && (
              <ClassChecklistPanel courseId={courseId} roundId={r.id} demoMode={demoMode} />
            )}

            {r.significantChanges.length > 0 && (
              <NotePrompt
                courseId={courseId}
                roundId={r.id}
                changes={r.significantChanges}
                alreadySubmittedAxes={r.submittedNoteAxes}
              />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
