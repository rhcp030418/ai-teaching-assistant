"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { saveImprovementNote } from "@/app/actions/improvement-notes";
import type { SignificantChange, RoundReport, SemesterComparison, RoundReportsResult } from "@/app/actions/round-reports";

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function Stat({ label, value, suffix = "" }: { label: string; value: string | number; suffix?: string }) {
  return (
    <div className="text-center">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-base font-semibold text-gray-800 mt-0.5">
        {value}
        <span className="text-xs text-gray-400 ml-0.5">{suffix}</span>
      </div>
    </div>
  );
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
    const result = await saveImprovementNote(courseId, roundId, change.axis, change.delta, note);
    setLoading(null);
    if (result.success) {
      setSubmitted((prev) => [...prev, change.axis]);
    } else {
      setError(result.error ?? "저장 실패");
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
        <CompareRow label="소통 만족도" prev={sem.prev.communicationAvg} curr={sem.curr.communicationAvg} unit="점" />
        <CompareRow label="이해도 높음" prev={sem.prev.comprehensionHigh} curr={sem.curr.comprehensionHigh} unit="%" />
        <CompareRow label="속도 적절" prev={sem.prev.speedModerate} curr={sem.curr.speedModerate} unit="%" />
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
}

export function RoundReports({ courseId, data }: Props) {
  const { rounds, currentSemester, semesterComparison } = data;
  const hasRounds = rounds.length > 0;
  const hasSemester = semesterComparison !== null;

  if (!hasRounds && !hasSemester) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">주차별 리포트</CardTitle>
          <CardDescription>종료된 라운드가 없습니다. 라운드가 종료되면 여기에 요약이 표시됩니다.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">주차별 리포트</CardTitle>
        <CardDescription>각 라운드 종료 시점의 응답 요약입니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 학기 전체 결산 */}
        {hasSemester ? (
          <SemesterCard courseId={courseId} sem={semesterComparison} />
        ) : (
          <div className="border border-gray-200 rounded-lg p-4 text-center text-sm text-gray-400">
            <p className="font-medium text-gray-500 mb-1">
              학기 전체 결산 <Badge className="bg-gray-100 text-gray-500 text-xs ml-1">{currentSemester}</Badge>
            </p>
            이전 학기 데이터가 없어 비교할 수 없습니다.
          </div>
        )}

        {hasRounds && <Separator />}

        {/* 주차별 리포트 */}
        {rounds.map((r) => (
          <div key={r.id} className="border border-gray-200 rounded-lg p-4">
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat label="속도 적절" value={r.speedModerate} suffix="%" />
                <Stat label="이해도 높음" value={r.comprehensionHigh} suffix="%" />
                <Stat label="소통 평균" value={r.communicationAvg} suffix="/5" />
                <Stat label="흥미도 평균" value={r.interestAvg} suffix="/5" />
                {r.assignmentAvg !== null && <Stat label="과제 평균" value={r.assignmentAvg} suffix="/5" />}
                {r.practiceAvg !== null && <Stat label="실습 평균" value={r.practiceAvg} suffix="/5" />}
              </div>
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
