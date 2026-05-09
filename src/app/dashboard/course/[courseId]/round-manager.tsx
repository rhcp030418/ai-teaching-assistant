"use client";

import { useState } from "react";
import { createRound, deleteRound, getRounds } from "@/app/actions/rounds";
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

interface Round {
  id: string;
  week: number;
  label: string | null;
  startDate: string;
  endDate: string;
  status: "pending" | "active" | "closed";
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
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const updated = await getRounds(courseId);
    setRounds(updated);
  }

  async function handleCreate() {
    setPending(true);
    setError(null);
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
    setPending(false);
  }

  async function handleDelete(roundId: string) {
    const result = await deleteRound(roundId);
    if (!result.success) {
      setError(result.error ?? "삭제 실패");
    }
    await refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">주차별 평가 관리</CardTitle>
        <CardDescription>
          시작/종료 시간을 지정하면 자동으로 평가가 열리고 닫힙니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md">{error}</div>
        )}

        {rounds.length > 0 && (
          <div className="space-y-2">
            {rounds.map((round) => (
              <div
                key={round.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  round.status === "active" ? "border-blue-300 bg-blue-50" : "border-gray-200"
                }`}
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-medium text-sm">
                    {round.label ?? `${round.week}주차`}
                  </span>
                  {statusBadge(round.status)}
                  <span className="text-xs text-gray-500">
                    {formatDate(round.startDate)} ~ {formatDate(round.endDate)}
                  </span>
                  {round.status === "closed" && (
                    <span className="text-xs text-gray-400">
                      제출 {round.submissionCount}명
                    </span>
                  )}
                </div>
                {round.feedbackCount === 0 && round.status !== "active" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(round.id)}
                  >
                    삭제
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 새 라운드 생성 */}
        <div className="border-t pt-4 space-y-2">
          <p className="text-sm font-medium">새 라운드 추가</p>
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
            {pending ? "생성 중..." : "라운드 추가"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
