export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { isDemoUser, isDemoVisibleCourse } from "@/lib/auth-utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SemesterSelector } from "./semester-selector";

function formatSemester(s: string) {
  const [year, term] = s.split("-");
  return `${year}년 ${term === "1" ? "1학기" : "2학기"}`;
}

export default async function DashboardPage(
  props: { searchParams?: Promise<{ semester?: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const searchParams = await props.searchParams;
  const selectedSemester = searchParams?.semester;

  // 데모 계정은 노출 과목 외에는 목록엔 보이되 클릭 불가(비활성화) 처리
  const isDemo = isDemoUser(session.user.email);

  // 해당 교수의 모든 학기 목록 조회 (내림차순)
  const allCourses = await prisma.course.findMany({
    where: { professorId: session.user.id },
    select: { semester: true },
  });
  const semesters = [...new Set(allCourses.map((c) => c.semester))]
    .sort()
    .reverse();

  // 학기 필터 적용
  const courses = await prisma.course.findMany({
    where: {
      professorId: session.user.id,
      ...(selectedSemester ? { semester: selectedSemester } : {}),
    },
    include: {
      _count: { select: { feedbacks: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">내 강의</h1>
          <p className="text-gray-500 text-sm mt-1">
            강의를 선택하면 피드백 분석을 확인할 수 있습니다.
          </p>
        </div>
      </div>

      <div className="mb-6">
        <Suspense fallback={null}>
          <SemesterSelector
            semesters={semesters}
            current={selectedSemester ?? "all"}
          />
        </Suspense>
      </div>

      {courses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            {selectedSemester
              ? "해당 학기에 등록된 강의가 없습니다."
              : "등록된 강의가 없습니다. 데모 데이터를 시드해주세요."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => {
            // 데모 계정: 노출 과목 외에는 비활성화(클릭 불가)
            const locked = isDemo && !isDemoVisibleCourse(course.name);

            if (locked) {
              return (
                <div
                  key={course.id}
                  aria-disabled="true"
                  title="데모에서는 데이터베이스 과목만 확인할 수 있습니다."
                  className="cursor-not-allowed opacity-60 select-none"
                >
                  <Card className="h-full bg-gray-50 border-dashed">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-gray-400 font-medium">
                          {formatSemester(course.semester)}
                        </p>
                        <span className="text-[11px] font-medium text-gray-400 bg-gray-200 rounded px-1.5 py-0.5">
                          준비 중
                        </span>
                      </div>
                      <CardTitle className="text-base leading-snug text-gray-400">
                        {course.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-gray-400">
                        데모에서는 제공되지 않는 강의입니다.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              );
            }

            return (
              <Link key={course.id} href={`/dashboard/course/${course.id}`}>
                <Card className="hover:border-blue-300 hover:shadow-md transition-all cursor-pointer h-full">
                  <CardHeader className="pb-3">
                    <p className="text-xs text-gray-400 font-medium">
                      {formatSemester(course.semester)}
                    </p>
                    <CardTitle className="text-base leading-snug">
                      {course.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-2xl font-bold text-gray-800">
                        {course._count.feedbacks}
                      </span>
                      <span className="text-sm text-gray-400">건의 피드백</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
