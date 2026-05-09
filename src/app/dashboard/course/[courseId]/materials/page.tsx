export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { MaterialsClient } from "./materials-client";

export default async function MaterialsPage(
  props: PageProps<"/dashboard/course/[courseId]/materials">
) {
  const { courseId } = await props.params;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const course = await prisma.course.findUnique({
    where: { id: courseId, professorId: session.user.id },
    include: {
      lectureMaterials: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!course) notFound();

  const materials = course.lectureMaterials.map((m) => ({
    id: m.id,
    fileName: m.fileName,
    hasAnalysis: !!m.analysis,
    analysis: m.analysis ? JSON.parse(m.analysis) : null,
    createdAt: m.createdAt.toISOString(),
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{course.name}</h1>
        <p className="text-gray-500 text-sm">강의자료 분석</p>
      </div>
      <MaterialsClient courseId={courseId} initialMaterials={materials} />
    </div>
  );
}
