export const dynamic = "force-dynamic";

import { getOwnedCourse } from "@/lib/course-access";
import { getBenchmark } from "@/app/actions/benchmark";
import { getImprovementCases } from "@/app/actions/improvement-cases";
import { computeFeedbackCounts } from "@/lib/feedback-stats";
import { isDemoUser } from "@/lib/auth-utils";
import { Benchmark } from "../benchmark";
import { ImprovementCases } from "../improvement-cases";

const PAGE_HERO =
  "rounded-[24px] border border-blue-100/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(237,247,255,0.82))] p-6 shadow-[0_18px_48px_-30px_rgba(23,87,168,0.42)]";

export default async function BenchmarkPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const course = await getOwnedCourse(courseId); // 소유권/데모 가드 + feedbacks
  const demoMode = isDemoUser(course.professor.email);

  const [benchmarkData, improvementCases] = await Promise.all([
    getBenchmark(courseId),
    getImprovementCases(courseId),
  ]);

  // overview page.tsx와 동일한 계산식 (total === 0 이면 각 값 0)
  const { total, speedCounts, compCounts, commSum } = computeFeedbackCounts(course.feedbacks);
  const myStats = {
    communicationAvg: total > 0 ? Math.round((commSum / total) * 10) / 10 : 0,
    speedModerateRatio: total > 0 ? Math.round((speedCounts.moderate / total) * 100) : 0,
    comprehensionHighRatio: total > 0 ? Math.round((compCounts.high / total) * 100) : 0,
  };

  return (
    <div className="space-y-10">
      <div className={PAGE_HERO}>
        <p className="text-xs font-bold text-[#0F5FD7]">Course Reference</p>
        <h2 className="mt-2 text-2xl font-extrabold text-[#10233F]">비교 참고</h2>
        <p className="mt-2 text-sm font-medium text-slate-500">
          유사 강의 경향과 익명 사례를 참고용으로 확인합니다.
        </p>
      </div>

      <Benchmark data={benchmarkData} />

  <ImprovementCases cases={improvementCases} myStats={myStats} demoMode={demoMode} />
    </div>
  );
}
