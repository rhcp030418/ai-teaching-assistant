"use client";

import { useState } from "react";
import { generateTokens } from "@/app/actions/tokens";
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

interface Props {
  courseId: string;
  initialStats: { total: number; used: number; unused: number };
}

export function TokenManager({ courseId, initialStats }: Props) {
  const [stats, setStats] = useState(initialStats);
  const [count, setCount] = useState(30);
  const [generatedLinks, setGeneratedLinks] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setPending(true);
    setError(null);
    setGeneratedLinks([]);

    const result = await generateTokens(courseId, count);
    setPending(false);

    if (result.success && result.tokens) {
      const { tokens } = result;
      const baseUrl = window.location.origin;
      const links = tokens.map(
        (token) => `${baseUrl}/feedback/${courseId}?token=${token}`
      );
      setGeneratedLinks(links);
      setStats((prev) => ({
        ...prev,
        total: prev.total + tokens.length,
        unused: prev.unused + tokens.length,
      }));
    } else {
      setError(result.error ?? "생성 실패");
    }
  }

  function handleCopyAll() {
    navigator.clipboard.writeText(generatedLinks.join("\n")).catch(() => {
      setError("클립보드 복사에 실패했습니다. 직접 텍스트를 선택해 복사해주세요.");
    });
  }

  return (
    <Card className={V3_CARD}>
      <CardHeader>
        <CardTitle className="text-base text-[#10233F]">추가 피드백 링크</CardTitle>
        <CardDescription className="text-slate-500">
          정규 주차 평가 외에 보충 의견이 필요할 때 사용할 1회용 익명 링크를 생성합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="flex gap-3">
          <Badge variant="secondary">전체 {stats.total}개</Badge>
          <Badge variant="secondary">사용됨 {stats.used}개</Badge>
          <Badge variant="outline">미사용 {stats.unused}개</Badge>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md">
            {error}
          </div>
        )}

        {/* Generate */}
        <div className="flex gap-2 items-center">
          <Input
            type="number"
            min={1}
            max={200}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-24"
          />
          <span className="text-sm text-gray-500">개</span>
          <Button onClick={handleGenerate} disabled={pending} size="sm">
            {pending ? "생성 중..." : "추가 피드백 링크 생성"}
          </Button>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50/55 px-3 py-2 text-xs font-medium leading-5 text-[#27496D]">
          이 링크로 제출된 의견은 특정 주차가 아닌 강의 전반에 대한 추가 피드백으로 저장되며,
          <span className="font-bold">추가 피드백 리포트</span>에서 확인할 수 있습니다.
        </div>

        {/* Generated links */}
        {generatedLinks.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                생성된 링크 ({generatedLinks.length}개)
              </p>
              <Button size="sm" variant="outline" onClick={handleCopyAll}>
                전체 복사
              </Button>
            </div>
            <div className="bg-blue-50/60 rounded-lg p-3 max-h-48 overflow-y-auto">
              {generatedLinks.map((link, i) => (
                <p key={i} className="text-xs text-[#27496D] font-mono break-all">
                  {link}
                </p>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
