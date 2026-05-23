export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/db";
import { getOwnedCourse } from "@/lib/course-access";
import { computeFeedbackCounts } from "@/lib/feedback-stats";
import { isDemoUser } from "@/lib/auth-utils";
import { CauseAnalysis } from "../cause-analysis";
import { ImprovementRoadmapPanel } from "../improvement-roadmap";

const PAGE_HERO =
  "rounded-[24px] border border-blue-100/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(237,247,255,0.82))] p-6 shadow-[0_18px_48px_-30px_rgba(23,87,168,0.42)]";
const ACTION_CARD =
  "block rounded-[22px] border border-blue-100 bg-white/90 p-5 shadow-[0_10px_30px_rgba(23,87,168,0.07)] transition hover:border-blue-200 hover:bg-blue-50/50";

export default async function AnalysisPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const course = await getOwnedCourse(courseId); // 소유권/데모 가드 + feedbacks
  const demoMode = isDemoUser(course.professor.email);

  const { total: totalFeedbacks } = computeFeedbackCounts(course.feedbacks);
  const materialCount = await prisma.lectureMaterial.count({
    where: { courseId, analysis: { not: null } },
  });

  return (
    <div className="space-y-10">
      <div className={PAGE_HERO}>
        <p className="text-xs font-bold text-[#0F5FD7]">Course Insight</p>
        <h2 className="mt-2 text-2xl font-extrabold text-[#10233F]">지원 인사이트</h2>
        <p className="mt-2 text-sm font-medium text-slate-500">
          필요할 때 열어보는 선택적 분석 도구입니다.
        </p>
      </div>

      {/* 체크리스트 본체는 RoundReports(관리 및 기록)에 있음 → 링크만 제공 */}
      <Link
        href={`/dashboard/course/${courseId}/management`}
        className={ACTION_CARD}
      >
        <p className="text-sm font-extrabold text-[#10233F]">수업 운영 참고 포인트</p>
        <p className="mt-1 text-sm font-medium text-slate-500">
          회차별 리포트와 체크리스트는 관리 및 기록에서 확인합니다. →
        </p>
      </Link>

      {/* 원인 분석 + 개선 로드맵 (피드백 3건 이상일 때, overview deepTab과 동일) */}
      {totalFeedbacks >= 3 ? (
        <div className="space-y-6">
          <CauseAnalysis courseId={courseId} hasMaterials={materialCount > 0} demoMode={demoMode} />
          <ImprovementRoadmapPanel courseId={courseId} demoMode={demoMode} />
        </div>
      ) : (
        <div className="rounded-[22px] border border-dashed border-blue-200 bg-white/80 py-12 text-center shadow-[0_10px_30px_rgba(23,87,168,0.05)]">
          <p className="text-sm font-bold text-[#10233F]">아직 분석할 피드백이 충분하지 않습니다.</p>
          <p className="mt-1 text-sm font-medium text-slate-500">
            피드백이 3건 이상 쌓이면 원인 분석과 개선 로드맵을 확인할 수 있습니다.
          </p>
        </div>
      )}
    </div>
  );
}
