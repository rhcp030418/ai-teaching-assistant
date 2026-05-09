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
  analyzeCauses,
  CauseAnalysisResult,
} from "@/app/actions/cause-analysis";

const axisColors: Record<string, string> = {
  "수업 속도": "bg-orange-100 text-orange-700",
  "자료 이해도": "bg-purple-100 text-purple-700",
  "소통 만족도": "bg-blue-100 text-blue-700",
};

export function CauseAnalysis({
  courseId,
  hasMaterials,
}: {
  courseId: string;
  hasMaterials: boolean;
}) {
  const [result, setResult] = useState<CauseAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleAnalyze() {
    setPending(true);
    setError(null);
    setResult(null);

    const res = await analyzeCauses(courseId);
    setPending(false);

    if (res.success && res.result) {
      setResult(res.result);
    } else {
      setError(res.error ?? "분석에 실패했습니다.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">원인 연결 분석</CardTitle>
        <CardDescription>
          학생 피드백과 강의자료를 교차 분석하여 가능한 원인을 추정합니다
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!result && (
          <div className="space-y-3">
            {!hasMaterials && (
              <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 p-3 rounded-md">
                강의자료가 아직 업로드되지 않았습니다. 피드백 데이터만으로
                분석하지만, 강의자료를 업로드하면 더 구체적인 원인 추정이
                가능합니다.
              </p>
            )}
            <Button onClick={handleAnalyze} disabled={pending}>
              {pending ? "AI 분석 중..." : "원인 분석 실행"}
            </Button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded font-medium">AI 분석 결과</span>
            </div>
            {result.causes.length === 0 ? (
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 p-3 rounded-md">
                모든 축에서 특별히 주목할 만한 패턴이 발견되지 않았습니다.
                전반적으로 양호한 상태입니다.
              </p>
            ) : (
              <div className="space-y-3">
                {result.causes.map((cause, i) => (
                  <div
                    key={i}
                    className="border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        className={
                          axisColors[cause.axis] ?? "bg-gray-100 text-gray-700"
                        }
                      >
                        {cause.axis}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">관찰: </span>
                      {cause.observation}
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">추정 원인: </span>
                      {cause.possibleCause}
                    </p>
                    {cause.materialEvidence && (
                      <p className="text-sm text-gray-500 bg-gray-50 p-2 rounded">
                        <span className="font-medium">자료 근거: </span>
                        {cause.materialEvidence}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {result.actionItems.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    개선 제안
                    <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-medium">AI</span>
                  </h4>
                  <ul className="space-y-1">
                    {result.actionItems.map((item, i) => (
                      <li
                        key={i}
                        className="text-sm text-gray-700 flex gap-2"
                      >
                        <span className="text-blue-500 shrink-0">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleAnalyze}
              disabled={pending}
            >
              {pending ? "분석 중..." : "다시 분석"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
