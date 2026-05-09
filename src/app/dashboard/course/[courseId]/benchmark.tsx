"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface BenchmarkData {
  myCommunicationAvg: number;
  categoryCommunicationAvg: number | null;
  semesterCommunicationAvg: number | null;
  prevSemesterCommunicationAvg: number | null;
  mySpeedModerateRatio: number;
  categorySpeedModerateRatio: number | null;
  myComprehensionHighRatio: number;
  categoryComprehensionHighRatio: number | null;
  categoryName: string;
  semester: string;
  prevSemester: string;
  categoryCourseCount: number;
  percentileRank: number | null;
}

function CompareRow({
  label,
  myValue,
  compareValue,
  compareLabel,
  unit,
}: {
  label: string;
  myValue: number;
  compareValue: number | null;
  compareLabel: string;
  unit: string;
}) {
  const diff =
    compareValue !== null ? Math.round((myValue - compareValue) * 10) / 10 : null;
  const diffColor =
    diff === null
      ? ""
      : diff > 0
        ? "text-green-600"
        : diff < 0
          ? "text-red-500"
          : "text-gray-400";

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex items-center gap-4 text-sm">
        <span className="font-semibold">
          {myValue}
          {unit}
        </span>
        {compareValue !== null ? (
          <span className="text-gray-400">
            {compareLabel}: {compareValue}
            {unit}
            {diff !== null && (
              <span className={`ml-1 ${diffColor}`}>
                ({diff > 0 ? "+" : ""}
                {diff})
              </span>
            )}
          </span>
        ) : (
          <span className="text-gray-300 text-xs">비교 데이터 없음</span>
        )}
      </div>
    </div>
  );
}

export function Benchmark({ data }: { data: BenchmarkData | null }) {
  if (!data) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">경향 비교</CardTitle>
        <CardDescription>
          {data.categoryName} 카테고리 기준 · 비교 대상{" "}
          {data.categoryCourseCount}개 강의
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {/* Percentile */}
        {data.percentileRank !== null && data.categoryCourseCount > 0 && (
          <div className="bg-blue-50 rounded-lg p-3 mb-3 text-center">
            <p className="text-sm text-blue-600">
              소통 만족도 기준, {data.categoryName} 카테고리 내{" "}
              <Badge className="bg-blue-100 text-blue-700">
                상위 {data.percentileRank}%
              </Badge>
            </p>
          </div>
        )}

        {/* Communication */}
        <CompareRow
          label="소통 만족도"
          myValue={data.myCommunicationAvg}
          compareValue={data.categoryCommunicationAvg}
          compareLabel="유사 교과목 평균"
          unit="점"
        />
        <CompareRow
          label={`${data.semester} 전체 평균`}
          myValue={data.myCommunicationAvg}
          compareValue={data.semesterCommunicationAvg}
          compareLabel="전체"
          unit="점"
        />
        {data.prevSemesterCommunicationAvg !== null && (
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-600">
              {data.prevSemester} 유사 교과목 평균
            </span>
            <span className="text-sm text-gray-400">
              {data.prevSemesterCommunicationAvg}점
            </span>
          </div>
        )}

        <div className="border-t my-2" />

        {/* Speed */}
        <CompareRow
          label="수업 속도 '적당' 비율"
          myValue={data.mySpeedModerateRatio}
          compareValue={data.categorySpeedModerateRatio}
          compareLabel="유사 교과목"
          unit="%"
        />

        {/* Comprehension */}
        <CompareRow
          label="자료 이해도 '높음' 비율"
          myValue={data.myComprehensionHighRatio}
          compareValue={data.categoryComprehensionHighRatio}
          compareLabel="유사 교과목"
          unit="%"
        />

        {data.categoryCourseCount === 0 && (
          <p className="text-xs text-gray-400 text-center pt-2">
            같은 카테고리의 다른 강의가 없어 비교 데이터가 제한적입니다.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
