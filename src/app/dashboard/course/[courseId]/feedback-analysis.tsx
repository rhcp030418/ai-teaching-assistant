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
import { Separator } from "@/components/ui/separator";
import { RadarChart } from "./radar-chart";
import { generateRadarSummary } from "@/app/actions/radar-summary";
import { summarizeComments } from "@/app/actions/filter-comments";
import { calcResponseRate } from "@/lib/utils";

interface CommentFeedback {
  comment: string;
  filteredComment: string | null;
  commentCategory: string | null;
  commentFilterReason: string | null;
  commentHasProfanity: boolean;
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
  speedCounts: { fast: number; moderate: number; slow: number };
  comprehensionCounts: { high: number; medium: number; low: number };
  communicationAvg: number;
  communicationDist: number[];
  commentFeedbacks: CommentFeedback[];
  radarAxes: RadarAxis[];
  categoryRadarAxes?: RadarAxis[];
  categoryName?: string;
  hideTitle?: boolean;
}

function Bar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 text-sm text-gray-600 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-16 text-sm text-gray-500 text-right">
        {count}건 ({pct}%)
      </span>
    </div>
  );
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
  communicationDist,
  commentFeedbacks,
  radarAxes,
  categoryRadarAxes,
  categoryName,
  hideTitle = false,
}: Props) {
  const isLowData = totalFeedbacks < 3;
  const responseRate = calcResponseRate(totalFeedbacks, studentCount);

  return (
    <div className="space-y-6">
      {/* Header */}
      {!hideTitle && (
        <div>
          <h1 className="text-2xl font-bold">{courseName}</h1>
          <p className="text-gray-500 text-sm">
            {professorName} 교수님 · {semester}
          </p>
        </div>
      )}

      {/* Response rate */}
      <div className="flex items-center gap-3">
        {responseRate !== null ? (
          <Badge variant="secondary">
            수강생 {studentCount}명 중 {totalFeedbacks}명 응답 ({responseRate}%)
          </Badge>
        ) : studentCount ? (
          <Badge variant="secondary">응답 {totalFeedbacks}건 (수강생 {studentCount}명)</Badge>
        ) : (
          <Badge variant="secondary">응답 {totalFeedbacks}건</Badge>
        )}
      </div>

      <ResponseRateWarning total={totalFeedbacks} studentCount={studentCount} />

      {/* Radar chart */}
      {totalFeedbacks > 0 && radarAxes.length >= 4 && (
        <Card className={isLowData ? "opacity-50" : ""}>
          <CardHeader>
            <CardTitle className="text-base">종합 평가</CardTitle>
            <CardDescription>
              {radarAxes.length}개 항목 기반 ({radarAxes.length === 4 ? "사" : radarAxes.length === 5 ? "오" : "육"}각형)
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {!isLowData && <AiSummaryLine courseId={courseId} initialSummary={aiSummaryCache} />}
            <RadarChart
              axes={radarAxes}
              compareAxes={categoryRadarAxes}
              compareLabel={categoryName ? `${categoryName} 분야 평균` : "유사 분야 평균"}
            />
          </CardContent>
        </Card>
      )}

      {/* 3-axis analysis */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Axis 1: Speed */}
        <Card className={isLowData ? "opacity-50" : ""}>
          <CardHeader>
            <CardTitle className="text-base">수업 속도</CardTitle>
            <CardDescription>수업 방식</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Bar
              label="빠름"
              count={speedCounts.fast}
              total={totalFeedbacks}
              color="bg-red-400"
            />
            <Bar
              label="적당"
              count={speedCounts.moderate}
              total={totalFeedbacks}
              color="bg-green-400"
            />
            <Bar
              label="느림"
              count={speedCounts.slow}
              total={totalFeedbacks}
              color="bg-blue-400"
            />
          </CardContent>
        </Card>

        {/* Axis 2: Comprehension */}
        <Card className={isLowData ? "opacity-50" : ""}>
          <CardHeader>
            <CardTitle className="text-base">자료 이해도</CardTitle>
            <CardDescription>콘텐츠</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Bar
              label="높음"
              count={comprehensionCounts.high}
              total={totalFeedbacks}
              color="bg-green-400"
            />
            <Bar
              label="보통"
              count={comprehensionCounts.medium}
              total={totalFeedbacks}
              color="bg-yellow-400"
            />
            <Bar
              label="낮음"
              count={comprehensionCounts.low}
              total={totalFeedbacks}
              color="bg-red-400"
            />
          </CardContent>
        </Card>

        {/* Axis 3: Communication */}
        <Card className={isLowData ? "opacity-50" : ""}>
          <CardHeader>
            <CardTitle className="text-base">소통 만족도</CardTitle>
            <CardDescription>소통</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-4">
              <span className="text-4xl font-bold text-blue-600">
                {communicationAvg}
              </span>
              <span className="text-gray-400 text-lg"> / 5</span>
            </div>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((score) => (
                <div key={score} className="flex items-center gap-2">
                  <span className="w-6 text-sm text-gray-500 text-right">
                    {score}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full bg-blue-400 rounded-full transition-all"
                      style={{
                        width:
                          totalFeedbacks > 0
                            ? `${(communicationDist[score - 1] / totalFeedbacks) * 100}%`
                            : "0%",
                      }}
                    />
                  </div>
                  <span className="w-8 text-xs text-gray-400">
                    {communicationDist[score - 1]}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {isLowData && totalFeedbacks > 0 && (
        <p className="text-sm text-gray-400 text-center">
          데이터가 부족하여 위 분석 결과가 흐리게 표시됩니다. 응답이 더
          쌓이면 정상적으로 표시됩니다.
        </p>
      )}

      <Separator />

      <CommentsSection commentFeedbacks={commentFeedbacks} />
    </div>
  );
}

function AiSummaryLine({ courseId, initialSummary }: { courseId: string; initialSummary?: string | null }) {
  const [summary, setSummary] = useState<string | null>(initialSummary ?? null);
  const [loading, setLoading] = useState(!initialSummary);

  useEffect(() => {
    if (initialSummary) return; // 캐시 있으면 AI 호출 안 함
    generateRadarSummary(courseId).then((res) => {
      if (res.success && res.summary) setSummary(res.summary);
      setLoading(false);
    });
  }, [courseId, initialSummary]);

  if (loading) {
    return (
      <div className="w-full flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5 text-sm text-blue-400 animate-pulse">
        <span className="shrink-0 text-xs bg-blue-200 text-blue-500 px-1.5 py-0.5 rounded font-medium">AI</span>
        <span>종합 평가를 생성하고 있습니다...</span>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="w-full flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5 text-sm text-blue-700">
      <span className="shrink-0 text-xs bg-blue-200 text-blue-700 px-1.5 py-0.5 rounded font-medium mt-0.5">AI</span>
      <span>{summary}</span>
    </div>
  );
}

function CommentItem({ item }: { item: CommentFeedback }) {
  const displayText = item.filteredComment ?? item.comment;
  return (
    <li className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
      <p>{displayText}</p>
    </li>
  );
}

function CommentsSection({
  commentFeedbacks,
}: {
  commentFeedbacks: CommentFeedback[];
}) {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // 미분류(null) 제외 + filteredComment가 있는 것만 표시 (감정 카테고리는 filteredComment=null이라 자연히 제외)
  const visibleComments = commentFeedbacks.filter(
    (cf) => cf.commentCategory !== null && cf.filteredComment !== null
  );
  const total = visibleComments.length;

  useEffect(() => {
    if (total === 0) return;
    setSummaryLoading(true);
    const commentTexts = visibleComments.map(
      (cf) => cf.filteredComment ?? cf.comment
    );
    summarizeComments(commentTexts).then((res) => {
      setSummary(res.summary);
      setSummaryLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">추가 의견</CardTitle>
            <CardDescription>
              학생들이 남긴 의견 ({total}건)
            </CardDescription>
          </div>
          {total > 0 && (
            <button
              onClick={() => setOpen((v) => !v)}
              className="text-xs text-gray-500 hover:text-gray-700 underline underline-offset-2 mt-1 shrink-0"
            >
              {open ? "접기" : "펼치기"}
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-gray-400 text-sm">남겨진 의견이 없습니다.</p>
        ) : open ? (
          <ul className="space-y-3">
            {visibleComments.map((item, i) => (
              <CommentItem key={`c-${i}`} item={item} />
            ))}
          </ul>
        ) : (
          <div className="text-sm text-gray-600 leading-relaxed">
            {summaryLoading ? (
              <p className="text-gray-400">AI 요약 생성 중...</p>
            ) : summary ? (
              <p>{summary}</p>
            ) : (
              <p className="text-gray-400">요약을 불러올 수 없습니다.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
