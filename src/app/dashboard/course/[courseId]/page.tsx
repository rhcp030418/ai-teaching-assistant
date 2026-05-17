export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { FeedbackAnalysis, CommentsSection } from "./feedback-analysis";
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
import { TokenManager } from "./token-manager";
import { getTokenStats } from "@/app/actions/tokens";
import { TrendAnalysis } from "./trend-analysis";
import { triggerSummaryIfNeeded } from "@/app/actions/radar-summary";
import { triggerMaterialReanalysisIfNeeded } from "@/app/actions/analyze-material";
import { calcResponseRate } from "@/lib/utils";
import { ImprovementRoadmapPanel } from "./improvement-roadmap";
import { ChatSidePanel } from "./chat-side-panel";
import { AnalysisTabs } from "./analysis-tabs";
import { computeFeedbackCounts } from "@/lib/feedback-stats";
import {
  COMM_AVG_THRESHOLD,
  SPEED_MODERATE_THRESHOLD,
  CHAT_COMP_SUGGESTION_THRESHOLD,
} from "@/lib/constants";

// ─── 동적 추천 질문 ────────────────────────────────────────────────────────────

function buildChatSuggestions(
  communicationAvg: number,
  speedModerateRatio: number,
  comprehensionHighRatio: number,
  totalFeedbacks: number,
): string[] {
  if (totalFeedbacks === 0) {
    return [
      "좋은 강의 피드백을 받으려면 어떻게 해야 할까?",
      "수업 속도를 어떻게 설정하는 게 좋을까?",
      "소통 만족도를 높이는 방법이 뭐야?",
      "학생 이해도를 높이는 전략을 알려줘.",
    ];
  }

  const suggestions: string[] = [];

  // 가장 낮은 지표부터 먼저
  if (communicationAvg < COMM_AVG_THRESHOLD) {
    suggestions.push(`소통 만족도가 ${communicationAvg}점으로 낮아. 어떻게 개선할 수 있을까?`);
  }
  if (comprehensionHighRatio < CHAT_COMP_SUGGESTION_THRESHOLD) {
    suggestions.push(`이해도 "높음"이 ${comprehensionHighRatio}%밖에 안 돼. 원인이 뭘까?`);
  }
  if (speedModerateRatio < SPEED_MODERATE_THRESHOLD) {
    suggestions.push(`수업 속도 "적당" 응답이 ${speedModerateRatio}%야. 어떻게 조정하면 좋을까?`);
  }

  const general = [
    "이번 학기에 가장 잘 된 부분은 뭐야?",
    "학생 의견 중 주목할 만한 게 있어?",
    "다음 회차에서 집중해야 할 게 뭐야?",
    "전체적인 강의 평가를 요약해줘.",
  ];
  for (const q of general) {
    if (suggestions.length >= 4) break;
    suggestions.push(q);
  }
  return suggestions.slice(0, 4);
}

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
  const {
    total: totalFeedbacks,
    speedCounts,
    compCounts: comprehensionCounts,
    commSum: communicationSum,
    interestSum, interestCount,
    assignmentSum, assignmentCount,
    practiceSum, practiceCount,
  } = computeFeedbackCounts(course.feedbacks);

  // communicationDist와 commentFeedbacks는 page 고유 — 별도 패스
  const communicationDist = [0, 0, 0, 0, 0];
  const commentFeedbacks: {
    comment: string | null;
    filteredComment: string | null;
    commentCategory: string | null;
    commentFilterReason: string | null;
    commentHasProfanity: boolean;
    freeText: string | null;
    roundId: string | null;
  }[] = [];

  for (const fb of course.feedbacks) {
    communicationDist[fb.communication - 1]++;
    if (fb.comment || fb.freeText) {
      commentFeedbacks.push({
        comment: fb.comment,
        filteredComment: fb.filteredComment,
        commentCategory: fb.commentCategory,
        commentFilterReason: fb.commentFilterReason,
        commentHasProfanity: fb.commentHasProfanity,
        freeText: fb.freeText,
        roundId: fb.roundId,
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

  // ─── 종료된 라운드 있으면 AI 한줄평 + 자료 재분석 백그라운드 생성 ────────────
  const now = new Date();
  const hasClosedRounds = course.feedbackRounds.some((r) => r.endDate <= now);
  triggerSummaryIfNeeded(courseId, hasClosedRounds, course.aiSummary ?? null);
  if (hasClosedRounds) triggerMaterialReanalysisIfNeeded(courseId);

  // ─── 데이터 패치 ─────────────────────────────────────────────────────────────
  const [benchmarkData, improvementCases, materialCount, rounds, roundReports, tokenStats] =
    await Promise.all([
      getBenchmark(courseId),
      getImprovementCases(courseId),
      prisma.lectureMaterial.count({
        where: { courseId, analysis: { not: null } },
      }),
      getRounds(courseId),
      getRoundReports(courseId),
      getTokenStats(courseId),
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
        {/* LEFT: 탭 분석 */}
        <AnalysisTabs
          feedbackTab={
            <>
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
              <CommentsSection commentFeedbacks={commentFeedbacks} rounds={rounds} />
            </>
          }
          deepTab={
            totalFeedbacks >= 3 ? (
              <>
                <CauseAnalysis courseId={courseId} hasMaterials={materialCount > 0} />
                <ImprovementRoadmapPanel courseId={courseId} />
              </>
            ) : (
              <p className="text-sm text-gray-400 py-8 text-center">
                피드백이 3건 이상 쌓이면 원인 분석과 개선 로드맵을 확인할 수 있습니다.
              </p>
            )
          }
          compareTab={
            <>
              <Benchmark data={benchmarkData} />
              <ImprovementCases
                cases={improvementCases}
                myStats={{
                  communicationAvg,
                  speedModerateRatio,
                  comprehensionHighRatio,
                }}
              />
            </>
          }
        />

        {/* RIGHT: 관리 사이드바 */}
        <div className="space-y-6">
          <RoundManager courseId={courseId} initialRounds={rounds} />
          <TokenManager courseId={courseId} initialStats={tokenStats} />
          <RoundReports courseId={courseId} data={roundReports} />
        </div>
      </div>
      <ChatSidePanel
        courseId={courseId}
        suggestions={buildChatSuggestions(communicationAvg, speedModerateRatio, comprehensionHighRatio, totalFeedbacks)}
      />
    </div>
  );
}
