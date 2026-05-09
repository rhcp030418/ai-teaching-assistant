export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { FeedbackAnalysis } from "./feedback-analysis";
import { Button } from "@/components/ui/button";
import { getBenchmark } from "@/app/actions/benchmark";
import { Benchmark } from "./benchmark";
import { getImprovementCases } from "@/app/actions/improvement-cases";
import { ImprovementCases } from "./improvement-cases";
import { CauseAnalysis } from "./cause-analysis";
import { RoundManager } from "./round-manager";
import { getRounds } from "@/app/actions/rounds";
import { RoundReports } from "./round-reports";
import { getRoundReports } from "@/app/actions/round-reports";
import { TrendAnalysis } from "./trend-analysis";
import { triggerSummaryIfNeeded } from "@/app/actions/radar-summary";
import { calcResponseRate } from "@/lib/utils";

// ─── KPI 카드 ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  suffix,
  accentClass,
  sub,
}: {
  label: string;
  value: string | number;
  suffix: string;
  accentClass: string;
  sub?: string;
}) {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 border-l-4 ${accentClass} p-5 shadow-sm`}
    >
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900">
        {value}
        <span className="text-base font-normal text-gray-400 ml-1">{suffix}</span>
      </p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ─── 페이지 ────────────────────────────────────────────────────────────────────

export default async function CourseDashboardPage(
  props: PageProps<"/dashboard/course/[courseId]">
) {
  const { courseId } = await props.params;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const course = await prisma.course.findUnique({
    where: { id: courseId, professorId: session.user.id },
    include: {
      professor: { select: { name: true } },
      feedbacks: { orderBy: { createdAt: "desc" } },
      feedbackRounds: { select: { endDate: true } },
    },
  });

  if (!course) notFound();

  // ─── 통계 계산 ───────────────────────────────────────────────────────────────
  const totalFeedbacks = course.feedbacks.length;

  const speedCounts = { fast: 0, moderate: 0, slow: 0 };
  const comprehensionCounts = { high: 0, medium: 0, low: 0 };
  let communicationSum = 0;
  const communicationDist = [0, 0, 0, 0, 0];
  let interestSum = 0;
  let interestCount = 0;
  let assignmentSum = 0;
  let assignmentCount = 0;
  let practiceSum = 0;
  let practiceCount = 0;

  const commentFeedbacks: {
    comment: string;
    filteredComment: string | null;
    commentCategory: string | null;
    commentFilterReason: string | null;
    commentHasProfanity: boolean;
  }[] = [];

  for (const fb of course.feedbacks) {
    speedCounts[fb.speed as keyof typeof speedCounts]++;
    comprehensionCounts[fb.comprehension as keyof typeof comprehensionCounts]++;
    communicationSum += fb.communication;
    communicationDist[fb.communication - 1]++;
    if (fb.interest != null) { interestSum += fb.interest; interestCount++; }
    if (fb.assignment != null) { assignmentSum += fb.assignment; assignmentCount++; }
    if (fb.practice != null) { practiceSum += fb.practice; practiceCount++; }
    if (fb.comment) {
      commentFeedbacks.push({
        comment: fb.comment,
        filteredComment: fb.filteredComment,
        commentCategory: fb.commentCategory,
        commentFilterReason: fb.commentFilterReason,
        commentHasProfanity: fb.commentHasProfanity,
      });
    }
  }

  const communicationAvg =
    totalFeedbacks > 0
      ? Math.round((communicationSum / totalFeedbacks) * 10) / 10
      : 0;

  const speedModerateRatio =
    totalFeedbacks > 0
      ? Math.round((speedCounts.moderate / totalFeedbacks) * 100)
      : 0;

  const comprehensionHighRatio =
    totalFeedbacks > 0
      ? Math.round((comprehensionCounts.high / totalFeedbacks) * 100)
      : 0;

  const radarAxes: { label: string; value: number }[] = [
    { label: "속도 적절성", value: totalFeedbacks > 0 ? (speedCounts.moderate / totalFeedbacks) * 100 : 0 },
    { label: "자료 이해도", value: totalFeedbacks > 0 ? (comprehensionCounts.high / totalFeedbacks) * 100 : 0 },
    { label: "소통 만족도", value: totalFeedbacks > 0 ? (communicationSum / totalFeedbacks / 5) * 100 : 0 },
    { label: "강의 흥미도", value: interestCount > 0 ? (interestSum / interestCount / 5) * 100 : 0 },
  ];
  if (course.hasAssignment && assignmentCount > 0) {
    radarAxes.push({ label: "과제 적절성", value: (assignmentSum / assignmentCount / 5) * 100 });
  }
  if (course.hasPractice && practiceCount > 0) {
    radarAxes.push({ label: "실습/예시", value: (practiceSum / practiceCount / 5) * 100 });
  }

  // 응답률은 수강생 수보다 응답이 적을 때만 유효 (주차별 누적이면 100% 초과 → 표시 안 함)
  const responseRate = calcResponseRate(totalFeedbacks, course.studentCount ?? null);

  // ─── 종료된 라운드 있으면 AI 한줄평 백그라운드 생성 ──────────────────────────
  const now = new Date();
  const hasClosedRounds = course.feedbackRounds.some((r) => r.endDate <= now);
  triggerSummaryIfNeeded(courseId, hasClosedRounds, course.aiSummary ?? null);

  // ─── 데이터 패치 ─────────────────────────────────────────────────────────────
  const [benchmarkData, improvementCases, materialCount, rounds, roundReports] =
    await Promise.all([
      getBenchmark(courseId),
      getImprovementCases(courseId),
      prisma.lectureMaterial.count({
        where: { courseId, analysis: { not: null } },
      }),
      getRounds(courseId),
      getRoundReports(courseId),
    ]);

  return (
    <div className="space-y-8">
      {/* ─── 헤더 ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            {course.name}
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {course.professor.name} 교수님 · {course.semester}
          </p>
        </div>
        <Link href={`/dashboard/course/${courseId}/materials`}>
          <Button variant="outline" size="sm">강의자료 분석</Button>
        </Link>
      </div>

      {/* ─── KPI 카드 ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="총 응답"
          value={totalFeedbacks}
          suffix="건"
          accentClass="border-l-gray-400"
          sub={course.studentCount ? `수강생 ${course.studentCount}명${responseRate !== null ? ` 중 ${responseRate}%` : ""}` : undefined}
        />
        <KpiCard
          label="소통 만족도"
          value={communicationAvg}
          suffix="/ 5"
          accentClass="border-l-blue-500"
        />
        <KpiCard
          label="이해도 높음"
          value={comprehensionHighRatio}
          suffix="%"
          accentClass="border-l-green-500"
        />
        <KpiCard
          label="속도 적절"
          value={speedModerateRatio}
          suffix="%"
          accentClass="border-l-orange-500"
        />
      </div>

      {/* ─── 2컬럼 레이아웃 ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 items-start">
        {/* LEFT: 분석 */}
        <div className="space-y-6">
          <FeedbackAnalysis
            courseId={courseId}
            aiSummaryCache={course.aiSummary ?? null}
            courseName={course.name}
            semester={course.semester}
            professorName={course.professor.name}
            totalFeedbacks={totalFeedbacks}
            studentCount={course.studentCount}
            speedCounts={speedCounts}
            comprehensionCounts={comprehensionCounts}
            communicationAvg={communicationAvg}
            communicationDist={communicationDist}
            commentFeedbacks={commentFeedbacks}
            radarAxes={radarAxes}
            categoryRadarAxes={benchmarkData?.categoryRadarAxes ?? undefined}
            categoryName={benchmarkData?.categoryName}
            hideTitle
          />
          <TrendAnalysis courseId={courseId} rounds={roundReports.rounds} />
          {totalFeedbacks >= 3 && (
            <CauseAnalysis courseId={courseId} hasMaterials={materialCount > 0} />
          )}
          <Benchmark data={benchmarkData} />
          <ImprovementCases
            cases={improvementCases}
            myStats={{
              communicationAvg,
              speedModerateRatio,
              comprehensionHighRatio,
            }}
          />
        </div>

        {/* RIGHT: 관리 사이드바 */}
        <div className="space-y-6">
          <RoundManager courseId={courseId} initialRounds={rounds} />
          <RoundReports courseId={courseId} data={roundReports} />
        </div>
      </div>
    </div>
  );
}
