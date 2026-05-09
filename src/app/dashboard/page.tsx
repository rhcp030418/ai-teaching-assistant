export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SemesterSelector } from "./semester-selector";

export default async function DashboardPage(
  props: { searchParams?: Promise<{ semester?: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const searchParams = await props.searchParams;
  const selectedSemester = searchParams?.semester;

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
        <SemesterSelector
          semesters={semesters}
          current={selectedSemester ?? "all"}
        />
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
          {courses.map((course) => (
            <Link key={course.id} href={`/dashboard/course/${course.id}`}>
              <Card className="hover:border-blue-300 hover:shadow-md transition-all cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="text-lg">{course.name}</CardTitle>
                  <CardDescription>{course.semester}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="secondary">
                    피드백 {course._count.feedbacks}건
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
