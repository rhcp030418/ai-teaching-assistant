"use client";

import { useState } from "react";
import { correctTone, ToneResult } from "@/app/actions/tone-correction";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const V3_CARD =
  "rounded-[22px] border-blue-100 bg-white/90 shadow-[0_14px_38px_-26px_rgba(23,87,168,0.45)]";

export function ToneClient() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ToneResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit() {
    setPending(true);
    setError(null);
    setResult(null);
    try {
      const res = await correctTone(text);
      if (res.success && res.result) {
        setResult(res.result);
      } else {
        setError(res.error ?? "분석 실패");
      }
    } catch {
      setError("분석 중 오류가 발생했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-[16px] border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {error}
        </div>
      )}

      {/* Input */}
      <Card className={V3_CARD}>
        <CardHeader>
          <CardTitle className="text-base text-[#10233F]">원문 입력</CardTitle>
          <CardDescription>
            학생에게 보낼 공지, 이메일, 메시지를 입력하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="예: 과제 제출 기한을 어긴 학생은 어떠한 사유도 인정하지 않겠음. 명심하기 바람."
            rows={5}
            className="min-h-[150px] rounded-[18px] border-blue-100 bg-white/85 text-[#27496D] focus-visible:ring-blue-200"
          />
          <Button
            onClick={handleSubmit}
            disabled={pending || text.length < 5}
            className="rounded-full bg-[#1677FF] px-5 font-bold text-white shadow-[0_12px_24px_rgba(22,119,255,0.20)] hover:bg-[#0F5FD7]"
          >
            {pending ? "분석 중..." : "톤 분석 및 보정"}
          </Button>
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <>
          {/* Overall tone */}
          <Card className={V3_CARD}>
            <CardHeader>
              <CardTitle className="text-base text-[#10233F]">전체 톤 평가</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary" className="text-sm">
                {result.overallTone}
              </Badge>
            </CardContent>
          </Card>

          {/* Issues */}
          {result.issues.length > 0 && (
            <Card className={V3_CARD}>
              <CardHeader>
                <CardTitle className="text-base text-[#10233F]">
                  감지된 표현 ({result.issues.length}건)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.issues.map((issue, i) => (
                  <div key={i} className="space-y-2">
                    {i > 0 && <Separator />}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">원문</p>
                        <p className="text-sm bg-red-50 text-red-700 p-2 rounded">
                          {issue.original}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">수정 제안</p>
                        <p className="text-sm bg-green-50 text-green-700 p-2 rounded">
                          {issue.suggestion}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">{issue.reason}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Corrected text */}
          <Card className={V3_CARD}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-[#10233F]">수정된 전체 텍스트</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigator.clipboard.writeText(result.corrected).catch(() => {})}
                >
                  복사
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-[16px] bg-blue-50/50 p-4 text-sm leading-7 text-[#27496D] whitespace-pre-wrap">
                {result.corrected}
              </div>
            </CardContent>
          </Card>

          {/* Comparison */}
          <Card className={V3_CARD}>
            <CardHeader>
              <CardTitle className="text-base text-[#10233F]">원문 vs 수정문 비교</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-2">원문</p>
                  <div className="bg-red-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
                    {text}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-2">수정문</p>
                  <div className="bg-green-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
                    {result.corrected}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
