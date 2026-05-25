export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ArrowRight, BookOpenText, CalendarDays, MessageSquareText, Sparkles } from "lucide-react";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
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
  const totalFeedbacks = courses.reduce(
    (sum, course) => sum + course._count.feedbacks,
    0,
  );
  const selectedLabel = selectedSemester ? formatSemester(selectedSemester) : "전체 학기";

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[30px] border border-blue-100/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.97),rgba(232,245,255,0.86))] p-7 shadow-[0_22px_58px_-34px_rgba(23,87,168,0.48)]">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#1677FF] via-[#38BDF8] to-[#8EE7FF]" />
        <div className="absolute right-0 top-0 h-full w-[38%] bg-[linear-gradient(135deg,transparent_0%,rgba(22,119,255,0.08)_100%)]" />
        <div className="relative grid gap-7 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-100/80 px-3 py-1.5 text-xs font-extrabold text-[#0F5FD7]">
              <Sparkles className="h-3.5 w-3.5" />
              Professor Dashboard
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight text-[#10233F]">내 강의</h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-[#27496D]">
              강의를 선택하면 학생 의견 요약, 주차별 평가 추이, 지원 인사이트를 강의 단위로 확인할 수 있습니다.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-[20px] border border-blue-100 bg-white/78 p-4 shadow-[0_10px_30px_rgba(23,87,168,0.07)]">
              <BookOpenText className="h-5 w-5 text-[#1677FF]" />
              <p className="mt-3 text-2xl font-black text-[#10233F]">{courses.length}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">강의</p>
            </div>
            <div className="rounded-[20px] border border-blue-100 bg-white/78 p-4 shadow-[0_10px_30px_rgba(23,87,168,0.07)]">
              <MessageSquareText className="h-5 w-5 text-emerald-500" />
              <p className="mt-3 text-2xl font-black text-[#10233F]">{totalFeedbacks}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">피드백</p>
            </div>
            <div className="rounded-[20px] border border-blue-100 bg-white/78 p-4 shadow-[0_10px_30px_rgba(23,87,168,0.07)]">
              <CalendarDays className="h-5 w-5 text-amber-500" />
              <p className="mt-3 text-lg font-black text-[#10233F]">{selectedLabel}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">조회 기준</p>
            </div>
          </div>
        </div>
      </section>

      <div className="rounded-[22px] border border-blue-100 bg-white/75 p-4 shadow-[0_14px_38px_-30px_rgba(23,87,168,0.36)] backdrop-blur">
        <Suspense fallback={null}>
          <SemesterSelector
            semesters={semesters}
            current={selectedSemester ?? "all"}
          />
        </Suspense>
      </div>

      {courses.length === 0 ? (
        <div className="rounded-[26px] border border-blue-100 bg-white/85 py-16 text-center text-sm font-medium text-slate-400 shadow-[0_14px_38px_-30px_rgba(23,87,168,0.36)]">
            {selectedSemester
              ? "해당 학기에 등록된 강의가 없습니다."
              : "등록된 강의가 없습니다. prisma/add-user.ts 스크립트로 강의를 등록하세요 (docs/DB_GUIDE.md 참고)."}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => {
            return (
              <Link key={course.id} href={`/dashboard/course/${course.id}`} className="group block h-full">
                <article className="relative h-full overflow-hidden rounded-[24px] border border-blue-100 bg-white/90 p-5 shadow-[0_14px_38px_-30px_rgba(23,87,168,0.42)] transition duration-200 group-hover:-translate-y-1 group-hover:border-blue-200 group-hover:shadow-[0_22px_48px_-28px_rgba(23,87,168,0.56)]">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#1677FF] via-[#38BDF8] to-[#8EE7FF]" />
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-extrabold text-[#0F5FD7]">
                      {formatSemester(course.semester)}
                      </p>
                      <h2 className="mt-3 text-lg font-extrabold leading-snug text-[#10233F]">
                        {course.name}
                      </h2>
                    </div>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-50 text-[#1677FF] transition group-hover:bg-[#1677FF] group-hover:text-white">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="mt-7 flex items-end justify-between gap-4 border-t border-blue-50 pt-4">
                    <div>
                      <p className="text-xs font-bold text-slate-400">누적 피드백</p>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-3xl font-black text-[#10233F]">
                        {course._count.feedbacks}
                      </span>
                        <span className="text-sm font-bold text-slate-400">건</span>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-600">
                      익명 집계
                    </span>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
