export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { FeedbackForm } from "./feedback-form";
import { Card, CardContent } from "@/components/ui/card";

function ErrorCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-semibold text-red-600">{title}</p>
            <p className="text-gray-500 mt-2">{description}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-semibold text-blue-600">{title}</p>
            <p className="text-gray-500 mt-2">{description}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default async function FeedbackPage(
  props: PageProps<"/feedback/[courseId]">
) {
  const { courseId } = await props.params;
  const searchParams = await props.searchParams;
  const token = searchParams?.token as string | undefined;

  if (!token) {
    return <ErrorCard title="접근 권한이 없습니다" description="피드백 링크를 통해 접근해주세요." />;
  }

  // 1. 다회용 토큰(학생용) 먼저 확인
  const studentToken = await prisma.studentCourseToken.findUnique({
    where: { token },
    include: { student: true },
  });

  if (studentToken) {
    // 다회용 토큰 — 학생 개인 링크
    if (studentToken.courseId !== courseId) {
      return <ErrorCard title="유효하지 않은 링크입니다" description="올바른 피드백 링크를 사용해주세요." />;
    }

    // 활성 라운드 확인 (시간 기반)
    const now = new Date();
    const activeRound = await prisma.feedbackRound.findFirst({
      where: {
        courseId,
        startDate: { lte: now },
        endDate: { gt: now },
      },
    });

    if (!activeRound) {
      return <InfoCard title="현재 평가 기간이 아닙니다" description="교수님이 평가를 열면 이 링크로 다시 접속해주세요." />;
    }

    // 이번 라운드 중복 제출 확인
    const submitted = await prisma.submissionLog.findUnique({
      where: {
        studentId_courseId_roundId: {
          studentId: studentToken.studentId,
          courseId,
          roundId: activeRound.id,
        },
      },
    });

    if (submitted) {
      return <InfoCard title="이번 주차 평가를 이미 완료했습니다" description={`${activeRound.label ?? activeRound.week + "주차"} 평가가 제출되었습니다.`} />;
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { professor: { select: { name: true } } },
    });
    if (!course) notFound();

    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">{course.name}</h1>
            <p className="text-gray-500 mt-1">
              {course.professor.name} 교수님 · {course.semester}
            </p>
            <p className="text-sm text-blue-500 mt-2 font-medium">
              {activeRound.label ?? `${activeRound.week}주차`} 평가
            </p>
            <p className="text-sm text-gray-400 mt-1">
              익명으로 제출되며, 수업 개선에 활용됩니다.
            </p>
          </div>
          <FeedbackForm courseId={courseId} token={token} mode="student" hasAssignment={course.hasAssignment} hasPractice={course.hasPractice} />
        </div>
      </div>
    );
  }

  // 2. 기존 1회용 토큰 확인
  const feedbackToken = await prisma.feedbackToken.findUnique({
    where: { token },
  });

  if (!feedbackToken || feedbackToken.courseId !== courseId || feedbackToken.used) {
    return (
      <ErrorCard
        title={feedbackToken?.used ? "이미 사용된 링크입니다" : "유효하지 않은 링크입니다"}
        description={feedbackToken?.used ? "이 링크로는 이미 피드백이 제출되었습니다." : "올바른 피드백 링크를 사용해주세요."}
      />
    );
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { professor: { select: { name: true } } },
  });
  if (!course) notFound();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{course.name}</h1>
          <p className="text-gray-500 mt-1">
            {course.professor.name} 교수님 · {course.semester}
          </p>
          <p className="text-sm text-gray-400 mt-2">
            익명으로 제출되며, 수업 개선에 활용됩니다.
          </p>
        </div>
        <FeedbackForm courseId={courseId} token={token} mode="legacy" hasAssignment={course.hasAssignment} hasPractice={course.hasPractice} />
      </div>
    </div>
  );
}
