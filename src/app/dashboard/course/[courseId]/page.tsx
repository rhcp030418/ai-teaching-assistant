export const dynamic = "force-dynamic";

import Link from "next/link";
import { CommentsSection, FeedbackAnalysis } from "./feedback-analysis";
import { TrendAnalysis } from "./trend-analysis";
import { getRounds } from "@/app/actions/rounds";
import { getRoundReports } from "@/app/actions/round-reports";
import { triggerSummaryIfNeeded } from "@/app/actions/radar-summary";
import { triggerMaterialReanalysisIfNeeded } from "@/app/actions/analyze-material";
import { computeFeedbackCounts, scoreToRatio } from "@/lib/feedback-stats";
import { getOwnedCourse } from "@/lib/course-access";
import { isDemoUser } from "@/lib/auth-utils";

// ─── 페이지 (현황 요약) ─────────────────────────────────────────────────────────

function formatRoundProgressLabel(round: { week: number; label: string | null }) {
  const label = round.label ?? `${round.week}주차`;
  return label.endsWith("평가") ? `${label} 진행 중` : `${label} 평가 진행 중`;
}

export default async function CourseDashboardPage(
  props: PageProps<"/dashboard/course/[courseId]">
) {
  const { courseId } = await props.params;
  // 소유권/데모 가드 + 강의 데이터. layout과 cache()로 dedupe.
  const course = await getOwnedCourse(courseId);
  const demoMode = isDemoUser(course.professor.email);

  // ─── 종료된 라운드 있으면 AI 한줄평 + 자료 재분석 백그라운드 생성 ────────────
  const now = new Date();
  const hasClosedRounds = course.feedbackRounds.some((r) => r.endDate <= now);
  triggerSummaryIfNeeded(courseId, hasClosedRounds, course.aiSummary ?? null);
  if (hasClosedRounds) triggerMaterialReanalysisIfNeeded(courseId);

  // ─── 데이터 패치 (현황 요약에 필요한 것만) ───────────────────────────────────
  const [rounds, roundReports] = await Promise.all([
    getRounds(courseId),
    getRoundReports(courseId),
  ]);

  const activeRound = rounds.find((r) => r.status === "active");
  const overviewFeedbacks = activeRound
    ? course.feedbacks.filter((fb) => fb.roundId === activeRound.id)
    : course.feedbacks;

  // ─── 통계 계산: 진행 중 라운드가 있으면 해당 라운드 기준, 없으면 전체 기준 ─────
  const {
    total: totalFeedbacks,
    speedCounts,
    compCounts: comprehensionCounts,
    comprehensionSum, comprehensionCount,
    materialHelpSum, materialHelpCount,
    commSum: communicationSum,
    interestSum, interestCount,
  } = computeFeedbackCounts(overviewFeedbacks);

  // communicationDist와 commentFeedbacks는 page 고유 — 별도 패스
  const communicationDist = [0, 0, 0, 0, 0];
  const commentFeedbacks: {
    comment: string | null;
    filteredComment: string | null;
    commentCategory: string | null;
    commentFilterReason: string | null;
    commentHasProfanity: boolean;
    roundId: string | null;
    createdAt: string;
  }[] = [];

  for (const fb of overviewFeedbacks) {
    communicationDist[fb.communication - 1]++;
    if (fb.comment) {
      commentFeedbacks.push({
        comment: fb.comment,
        filteredComment: fb.filteredComment,
        commentCategory: fb.commentCategory,
        commentFilterReason: fb.commentFilterReason,
        commentHasProfanity: fb.commentHasProfanity,
        roundId: fb.roundId,
        createdAt: fb.createdAt.toISOString(),
      });
    }
  }

  const communicationAvg =
    totalFeedbacks > 0
      ? Math.round((communicationSum / totalFeedbacks) * 10) / 10
      : 0;

  const radarAxes: { label: string; value: number }[] = [
    { label: "내용 이해", value: scoreToRatio(comprehensionSum, comprehensionCount) },
    { label: "자료·예시 도움", value: scoreToRatio(materialHelpSum, materialHelpCount) },
    { label: "질문·소통 편의", value: totalFeedbacks > 0 ? (communicationSum / totalFeedbacks / 5) * 100 : 0 },
    { label: "학습 몰입", value: scoreToRatio(interestSum, interestCount) },
  ];

  return (
    <div>
      {/* ─── 2컬럼: 분석 본문 + slim 상태 사이드바 ───────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">
        {/* LEFT: 피드백 분석 + 추세 (탭 없이 직접 렌더) */}
        <div className="space-y-5">
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
            rounds={rounds}
            radarAxes={radarAxes}
            hideTitle
            showComments={false}
            demoMode={demoMode}
          />
          <TrendAnalysis courseId={courseId} rounds={roundReports.rounds} demoMode={demoMode} />
          <CommentsSection commentFeedbacks={commentFeedbacks} rounds={rounds} demoMode={demoMode} />
        </div>

        {/* RIGHT: slim 상태 사이드바 */}
        <aside className="space-y-4 xl:sticky xl:top-24">
          {/* 현재 라운드 */}
          {activeRound ? (
            <div className="overflow-hidden rounded-[22px] border border-transparent bg-[radial-gradient(circle_at_86%_16%,rgba(255,255,255,0.3),transparent_30%),linear-gradient(155deg,#1677ff_0%,#38bdf8_100%)] p-[18px] text-white shadow-[0_20px_46px_rgba(22,119,255,0.24)]">
              <h2 className="text-base font-extrabold">현재 라운드</h2>
              <p className="mt-1 text-sm text-white/80">
                {formatRoundProgressLabel(activeRound)}
              </p>
              <div className="mt-[18px] space-y-0">
                <div className="flex items-center justify-between border-t border-white/25 py-3 text-sm font-bold">
                  <span>피드백</span>
                  <strong className="text-base">{activeRound.feedbackCount}건</strong>
                </div>
                <div className="flex items-center justify-between border-t border-white/25 py-3 text-sm font-bold">
                  <span>제출</span>
                  <strong className="text-base">{activeRound.submissionCount}건</strong>
                </div>
                <div className="flex items-center justify-between border-t border-white/25 py-3 text-sm font-bold">
                  <span>종료</span>
                  <strong className="text-sm">
                    {new Date(activeRound.endDate).toLocaleString("ko-KR", {
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </strong>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-[22px] border border-blue-100 bg-white/90 p-[18px] shadow-[0_10px_30px_rgba(23,87,168,0.07)]">
              <p className="mb-2 text-base font-extrabold text-[#10233F]">현재 라운드</p>
              <p className="text-sm text-slate-400">진행 중인 평가가 없습니다.</p>
              <Link
                href={`/dashboard/course/${courseId}/management`}
                className="mt-2 inline-block text-xs font-semibold text-[#1677FF] hover:text-[#0F5FD7]"
              >
                관리 및 기록에서 라운드 설정하기 →
              </Link>
            </div>
          )}

          <div className="rounded-[22px] border border-blue-100 bg-white/90 p-[18px] shadow-[0_10px_30px_rgba(23,87,168,0.07)]">
            <h2 className="text-base font-extrabold text-[#10233F]">데이터 기준</h2>
            <div className="mt-3.5 space-y-2.5 text-sm font-semibold text-slate-500">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />
                익명 집계 완료
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />
                개별 학생 정보 미포함
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />
                강의 범위 내 질문만 사용
              </div>
            </div>
          </div>

          <div className="rounded-[22px] border border-amber-200/80 bg-[linear-gradient(135deg,rgba(255,251,235,0.92),rgba(255,255,255,0.86))] p-[18px] shadow-[0_10px_30px_rgba(245,158,11,0.08)]">
            <p className="text-sm font-extrabold text-[#10233F]">해석 안내</p>
            <p className="mt-2 text-sm leading-6 text-[#6B5A31]">
              AI 요약과 지표는 학생 의견을 빠르게 훑기 위한 참고 자료입니다. 응답 수가 적거나 의견이 짧은 회차는 원문과 수업 맥락을 함께 확인해 주세요.
            </p>
            <Link
              href="/dashboard/guide"
              className="mt-4 inline-flex rounded-full border border-amber-200 bg-white/70 px-3 py-2 text-xs font-extrabold text-amber-700 transition hover:bg-amber-50"
            >
              사용 설명서 보기 →
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
