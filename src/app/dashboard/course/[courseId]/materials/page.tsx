export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { MaterialsClient } from "./materials-client";
import type { MaterialAnalysis } from "@/app/actions/analyze-material";

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
                select: { speed: true, comprehension: true, communication: true, practice: true },
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
      roundStats = {
        total,
        comprehensionHigh: Math.round(
          (fbs.filter((f) => f.comprehension === "high").length / total) * 100
        ),
        communicationAvg:
          Math.round((fbs.reduce((s, f) => s + f.communication, 0) / total) * 10) / 10,
        speedModerate: Math.round(
          (fbs.filter((f) => f.speed === "moderate").length / total) * 100
        ),
        practiceAvg: practiceVals.length > 0
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
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{course.name}</h1>
        <p className="text-gray-500 text-sm">강의자료 분석</p>
      </div>
      <MaterialsClient
        courseId={courseId}
        initialMaterials={materials}
        rounds={course.feedbackRounds}
      />
    </div>
  );
}
