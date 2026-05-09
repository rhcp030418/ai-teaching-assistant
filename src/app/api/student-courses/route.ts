import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// 크롬 확장 사이드 패널에서 호출
// 학생 토큰(studentNo 기반)으로 수강 과목 + 활성 라운드 + 제출 여부 조회
export async function GET(req: NextRequest) {
  const studentNo = req.nextUrl.searchParams.get("studentNo");

  if (!studentNo) {
    return NextResponse.json({ error: "studentNo 파라미터가 필요합니다." }, { status: 400 });
  }

  const now = new Date();
  const student = await prisma.student.findUnique({
    where: { studentNo },
    include: {
      tokens: {
        include: {
          course: {
            include: {
              professor: { select: { name: true } },
              feedbackRounds: {
                where: {
                  startDate: { lte: now },
                  endDate: { gt: now },
                },
                take: 1,
              },
            },
          },
        },
      },
      submissions: true,
    },
  });

  if (!student) {
    return NextResponse.json({ error: "등록되지 않은 학생입니다." }, { status: 404 });
  }

  const courses = student.tokens.map((t) => {
    const activeRound = t.course.feedbackRounds[0] ?? null;
    const submitted = activeRound
      ? student.submissions.some(
          (s) => s.courseId === t.courseId && s.roundId === activeRound.id
        )
      : false;

    return {
      courseId: t.courseId,
      courseName: t.course.name,
      semester: t.course.semester,
      professorName: t.course.professor.name,
      token: t.token,
      activeRound: activeRound
        ? { id: activeRound.id, week: activeRound.week, label: activeRound.label }
        : null,
      submitted,
    };
  });

  return NextResponse.json({
    student: { name: student.name, studentNo: student.studentNo },
    courses,
  });
}
