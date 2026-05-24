export const dynamic = "force-dynamic";

import { getOwnedCourse } from "@/lib/course-access";
import { getRounds } from "@/app/actions/rounds";
import { getAdditionalFeedbacks, getTokenStats } from "@/app/actions/tokens";
import { getRoundReports } from "@/app/actions/round-reports";
import { isDemoUser } from "@/lib/auth-utils";
import { RoundManager } from "../round-manager";
import { TokenManager } from "../token-manager";
import { RoundReports } from "../round-reports";

const PAGE_HERO =
  "rounded-[24px] border border-blue-100/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(237,247,255,0.82))] p-6 shadow-[0_18px_48px_-30px_rgba(23,87,168,0.42)]";
const SECTION_TITLE = "text-lg font-extrabold text-[#10233F]";
const SECTION_DESC = "mt-1 text-sm font-medium text-slate-500";

export default async function ManagementPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const course = await getOwnedCourse(courseId); // 소유권/데모 가드
  const demoMode = isDemoUser(course.professor.email);

  const [rounds, tokenStats, additionalFeedbacks, roundReports] = await Promise.all([
    getRounds(courseId),
    getTokenStats(courseId),
    getAdditionalFeedbacks(courseId),
    getRoundReports(courseId),
  ]);

  return (
    <div className="space-y-10">
      <div className={PAGE_HERO}>
        <p className="text-xs font-bold text-[#0F5FD7]">Course Operation</p>
        <h2 className="mt-2 text-2xl font-extrabold text-[#10233F]">관리 및 기록</h2>
        <p className="mt-2 text-sm font-medium text-slate-500">
          평가 회차, 추가 피드백 링크, 회차별 기록을 한 곳에서 관리합니다.
        </p>
      </div>

      {/* ─── 상단: 운영 도구 ─────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className={SECTION_TITLE}>운영 도구</h2>
          <p className={SECTION_DESC}>
            주차별 강의평가 회차와 추가 피드백 링크를 관리합니다.
          </p>
        </div>
        <div className="space-y-6">
          <RoundManager courseId={courseId} initialRounds={rounds} demoMode={demoMode} />
          <TokenManager courseId={courseId} initialStats={tokenStats} initialFeedbacks={additionalFeedbacks} />
        </div>
      </section>

      {/* ─── 하단: 주차별 상세 분석 (전체 폭) ─────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className={SECTION_TITLE}>주차별 상세 분석</h2>
          <p className={SECTION_DESC}>
            종료된 회차의 지표 변화, 강의자료 연결, 수업 운영 참고 포인트를 함께 확인합니다.
          </p>
        </div>
        <RoundReports courseId={courseId} data={roundReports} demoMode={demoMode} />
      </section>
    </div>
  );
}
