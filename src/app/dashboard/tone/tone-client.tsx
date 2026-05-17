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
    <div className="space-y-6 max-w-3xl">
      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md">
          {error}
        </div>
      )}

      {/* Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">원문 입력</CardTitle>
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
          />
          <Button onClick={handleSubmit} disabled={pending || text.length < 5}>
            {pending ? "분석 중..." : "톤 분석 및 보정"}
          </Button>
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <>
          {/* Overall tone */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">전체 톤 평가</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary" className="text-sm">
                {result.overallTone}
              </Badge>
            </CardContent>
          </Card>

          {/* Issues */}
          {result.issues.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
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
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">수정된 전체 텍스트</CardTitle>
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
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
                {result.corrected}
              </div>
            </CardContent>
          </Card>

          {/* Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">원문 vs 수정문 비교</CardTitle>
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
