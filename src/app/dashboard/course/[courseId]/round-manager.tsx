"use client";

import { useState } from "react";
import { createRound, deleteRound, getRounds, updateRoundPeriod } from "@/app/actions/rounds";
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

interface Round {
  id: string;
  week: number;
  label: string | null;
  startDate: string;
  endDate: string;
  status: "pending" | "active" | "closed" | "overlap";
  feedbackCount: number;
  submissionCount: number;
}

interface Props {
  courseId: string;
  initialRounds: Round[];
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function statusBadge(status: Round["status"]) {
  if (status === "active") return <Badge className="bg-blue-100 text-blue-700 text-xs">진행 중</Badge>;
  if (status === "closed") return <Badge className="bg-gray-100 text-gray-600 text-xs">종료</Badge>;
  if (status === "overlap") return <Badge className="bg-red-100 text-red-700 text-xs">기간 겹침</Badge>;
  return <Badge className="bg-yellow-100 text-yellow-700 text-xs">대기</Badge>;
}

// 기본값: 시작=오늘 00:00, 종료=7일 후 23:59
function getDefaultDates() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  end.setHours(23, 59, 0, 0);
  return {
    start: toLocalDateTimeInput(start),
    end: toLocalDateTimeInput(end),
  };
}

function toLocalDateTimeInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function RoundManager({ courseId, initialRounds }: Props) {
  const [rounds, setRounds] = useState<Round[]>(initialRounds);
  const [newWeek, setNewWeek] = useState(
    initialRounds.length > 0 ? Math.max(...initialRounds.map((r) => r.week)) + 1 : 1
  );
  const defaults = getDefaultDates();
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const [pending, setPending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(initialRounds[0]?.id ?? null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const updated = await getRounds(courseId);
    setRounds(updated);
  }

  async function handleCreate() {
    setPending(true);
    setError(null);
    try {
      const result = await createRound(
        courseId,
        newWeek,
        new Date(startDate).toISOString(),
        new Date(endDate).toISOString()
      );
      if (result.success) {
        setNewWeek(newWeek + 1);
        await refresh();
      } else {
        setError(result.error ?? "생성 실패");
      }
    } catch {
      setError("생성 중 오류가 발생했습니다.");
    } finally {
      setPending(false);
    }
  }

  function startEdit(round: Round) {
    setExpandedId(round.id);
    setEditingId(round.id);
    setEditStartDate(toLocalDateTimeInput(new Date(round.startDate)));
    setEditEndDate(toLocalDateTimeInput(new Date(round.endDate)));
    setError(null);
  }

  async function handleSavePeriod(roundId: string) {
    setSavingId(roundId);
    setError(null);
    try {
      const result = await updateRoundPeriod(
        roundId,
        new Date(editStartDate).toISOString(),
        new Date(editEndDate).toISOString()
      );
      if (result.success) {
        setEditingId(null);
        await refresh();
      } else {
        setError(result.error ?? "기간 수정 실패");
      }
    } catch {
      setError("기간 수정 중 오류가 발생했습니다.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(roundId: string) {
    if (deletingId) return;
    setDeletingId(roundId);
    setError(null);
    try {
      const result = await deleteRound(roundId);
      if (!result.success) {
        setError(result.error ?? "삭제 실패");
      }
      await refresh();
    } catch {
      setError("삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Card className={V3_CARD}>
      <CardHeader>
        <CardTitle className="text-base text-[#10233F]">강의평가 회차 관리</CardTitle>
        <CardDescription className="text-slate-500">
          주차별 평가 기간을 만들고, 진행 시간을 조정합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md">{error}</div>
        )}

        {rounds.length > 0 && (
          <div className="space-y-3">
            {rounds.map((round) => (
              <div
                key={round.id}
                className={`rounded-2xl border p-4 ${
                  round.status === "active"
                    ? "border-blue-300 bg-blue-50/80 shadow-[0_12px_28px_-22px_rgba(22,119,255,0.8)]"
                    : round.status === "overlap"
                      ? "border-red-200 bg-red-50/70"
                    : "border-blue-100 bg-white/75"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setExpandedId((prev) => (prev === round.id ? null : round.id))}
                  className="flex w-full items-start justify-between gap-4 text-left"
                  aria-expanded={expandedId === round.id}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-extrabold text-[#10233F]">
                        {round.label ?? `${round.week}주차`}
                      </span>
                      {statusBadge(round.status)}
                    </div>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      운영 기간 {formatDate(round.startDate)} ~ {formatDate(round.endDate)}
                    </p>
                  </div>
                  <span className="mt-0.5 text-xs font-bold text-slate-400">
                    {expandedId === round.id ? "접기" : "상세"}
                  </span>
                </button>
                {expandedId === round.id && (
                  <div className="mt-4 space-y-3 border-t border-white/70 pt-3">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      <div className="rounded-xl bg-white/80 px-3 py-2">
                        <p className="text-[11px] font-bold text-slate-400">피드백</p>
                        <p className="mt-0.5 text-sm font-extrabold text-[#10233F]">{round.feedbackCount}건</p>
                      </div>
                      <div className="rounded-xl bg-white/80 px-3 py-2">
                        <p className="text-[11px] font-bold text-slate-400">제출자</p>
                        <p className="mt-0.5 text-sm font-extrabold text-[#10233F]">{round.submissionCount}명</p>
                      </div>
                      <div className="col-span-2 rounded-xl bg-white/80 px-3 py-2 sm:col-span-1">
                        <p className="text-[11px] font-bold text-slate-400">주차</p>
                        <p className="mt-0.5 text-sm font-extrabold text-[#10233F]">{round.week}주차</p>
                      </div>
                    </div>

                    {round.status === "overlap" && (
                      <p className="rounded-xl border border-red-100 bg-white/75 px-3 py-2 text-xs font-semibold leading-5 text-red-600">
                        현재 시간 기준으로 다른 평가 회차와 기간이 겹칩니다. 학생 제출 라운드가 모호해질 수 있으니 운영 기간을 조정해주세요.
                      </p>
                    )}

                    {editingId === round.id ? (
                      <div className="rounded-2xl border border-blue-100 bg-white/80 p-3">
                        <p className="text-xs font-extrabold text-[#10233F]">운영 기간 수정</p>
                        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <div>
                            <label className="text-xs font-semibold text-slate-500">시작</label>
                            <Input
                              type="datetime-local"
                              value={editStartDate}
                              onChange={(e) => setEditStartDate(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-slate-500">종료</label>
                            <Input
                              type="datetime-local"
                              value={editEndDate}
                              onChange={(e) => setEditEndDate(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSavePeriod(round.id)}
                            disabled={savingId === round.id}
                            className="bg-[#1677FF] hover:bg-[#0F5FD7]"
                          >
                            {savingId === round.id ? "저장 중..." : "기간 저장"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingId(null)}
                            disabled={savingId === round.id}
                          >
                            취소
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(round)}
                          className="border-blue-100 text-slate-600 hover:bg-blue-50"
                        >
                          운영 기간 수정
                        </Button>
                        {round.feedbackCount === 0 && round.status !== "active" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(round.id)}
                            disabled={deletingId === round.id}
                            className="border-blue-100 text-slate-600 hover:bg-blue-50"
                          >
                            {deletingId === round.id ? "삭제 중..." : "삭제"}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 새 평가 회차 생성 */}
        <div className="border-t border-blue-100 pt-4 space-y-2">
          <p className="text-sm font-bold text-[#10233F]">강의평가 회차 생성</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-gray-500">주차</label>
              <Input
                type="number"
                min={1}
                max={52}
                value={newWeek}
                onChange={(e) => setNewWeek(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">시작</label>
              <Input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">종료</label>
              <Input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleCreate} disabled={pending} size="sm" className="w-full sm:w-auto">
            {pending ? "생성 중..." : "평가 회차 생성"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
