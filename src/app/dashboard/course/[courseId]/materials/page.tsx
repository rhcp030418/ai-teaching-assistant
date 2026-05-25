export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { MaterialsClient } from "./materials-client";
import type { MaterialAnalysis } from "@/app/actions/analyze-material";
import { comprehensionScore } from "@/lib/feedback-stats";

const PAGE_HERO =
  "rounded-[24px] border border-blue-100/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(237,247,255,0.82))] p-6 shadow-[0_18px_48px_-30px_rgba(23,87,168,0.42)]";

export default async function MaterialsPage(
  props: PageProps<"/dashboard/course/[courseId]/materials">
) {
  const { courseId } = await props.params;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const course = await prisma.course.findUnique({
    where: { id: courseId, professorId: session.user.id },
    include: {
      lectureMaterials: {
        orderBy: { createdAt: "desc" },
        include: {
          round: {
            select: {
              week: true,
              label: true,
              endDate: true,
              feedbacks: {
                select: { speed: true, comprehension: true, materialHelp: true, communication: true, practice: true },
              },
            },
          },
        },
      },
      feedbackRounds: {
        orderBy: { week: "asc" },
        select: { id: true, week: true, label: true },
      },
    },
  });

  if (!course) notFound();

  const materials = course.lectureMaterials.map((m) => {
    let roundStats = null;
    if (m.round && m.round.feedbacks.length > 0) {
      const fbs = m.round.feedbacks;
      const total = fbs.length;
      const practiceVals = fbs.filter((f) => f.practice != null).map((f) => f.practice as number);
      const materialVals = fbs.filter((f) => f.materialHelp != null).map((f) => f.materialHelp as number);
      roundStats = {
        total,
        comprehensionHigh: Math.round(
          (fbs.filter((f) => comprehensionScore(f.comprehension) >= 4).length / total) * 100
        ),
        communicationAvg:
          Math.round((fbs.reduce((s, f) => s + f.communication, 0) / total) * 10) / 10,
        speedModerate: Math.round(
          (fbs.filter((f) => f.speed === "moderate").length / total) * 100
        ),
        practiceAvg: materialVals.length > 0
          ? Math.round((materialVals.reduce((a, b) => a + b, 0) / materialVals.length) * 10) / 10
          : practiceVals.length > 0
          ? Math.round((practiceVals.reduce((a, b) => a + b, 0) / practiceVals.length) * 10) / 10
          : null,
      };
    }

    // 스테일 판단: 분석 완료 + 라운드 종료 이후 피드백이 쌓였는데 재분석 안 된 경우
    const isStale =
      !!m.analysis &&
      m.analysisUpdatedAt !== null &&
      m.round !== null &&
      new Date(m.analysisUpdatedAt) <= m.round.endDate &&
      m.round.feedbacks.length >= 3;

    return {
      id: m.id,
      fileName: m.fileName,
      hasAnalysis: !!m.analysis,
      analysis: (() => {
        if (!m.analysis) return null;
        try {
          return JSON.parse(m.analysis) as MaterialAnalysis;
        } catch {
          return null;
        }
      })(),
      createdAt: m.createdAt.toISOString(),
      roundId: m.roundId,
      roundLabel: m.round ? (m.round.label ?? `${m.round.week}주차`) : null,
      roundWeek: m.round?.week ?? null,
      roundStats,
      analysisUpdatedAt: m.analysisUpdatedAt?.toISOString() ?? null,
      roundEndDate: m.round?.endDate?.toISOString() ?? null,
      isStale,
    };
  });

  return (
    <div className="space-y-8">
      <div className={PAGE_HERO}>
        <p className="text-xs font-bold text-[#0F5FD7]">Course Materials</p>
        <h2 className="mt-2 text-2xl font-extrabold text-[#10233F]">강의자료 분석</h2>
        <p className="mt-2 text-sm font-medium text-slate-500">
          업로드한 강의자료와 학생 피드백의 연결 맥락을 확인합니다.
        </p>
      </div>
      <MaterialsClient
        courseId={courseId}
        initialMaterials={materials}
        rounds={course.feedbackRounds}
      />
    </div>
  );
}
