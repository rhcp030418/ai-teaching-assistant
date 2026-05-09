import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "node:crypto";

// 크롬 확장에서 학생 정보 + 수강 과목 수신
// → Student upsert + CourseStudent 등록 + StudentCourseToken 자동 발급
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userInfo, courses } = body as {
    userInfo: { name: string; studentId: string; email: string; department: string };
    courses: { id: number; title: string }[];
  };

  if (!userInfo?.studentId || !userInfo?.name) {
    return NextResponse.json({ error: "학번과 이름은 필수입니다." }, { status: 400 });
  }

  // 1. Student upsert
  const student = await prisma.student.upsert({
    where: { studentNo: userInfo.studentId },
    update: {
      name: userInfo.name,
      email: userInfo.email || undefined,
      department: userInfo.department || undefined,
    },
    create: {
      studentNo: userInfo.studentId,
      name: userInfo.name,
      email: userInfo.email || null,
      department: userInfo.department || null,
    },
  });

  // 2. e-class 과목 ID로 Course 매칭 + 수강 등록 + 토큰 발급
  const enrolledCourses: { courseId: string; courseName: string; token: string }[] = [];

  for (const eclassCourse of courses) {
    // eclassId로 매칭되는 과목 찾기
    const course = await prisma.course.findFirst({
      where: { eclassId: eclassCourse.id },
    });

    if (!course) continue; // 매칭 안 되는 과목은 건너뜀

    // CourseStudent upsert
    await prisma.courseStudent.upsert({
      where: {
        courseId_studentId: { courseId: course.id, studentId: student.id },
      },
      update: {},
      create: { courseId: course.id, studentId: student.id },
    });

    // StudentCourseToken upsert
    const tokenRecord = await prisma.studentCourseToken.upsert({
      where: {
        courseId_studentId: { courseId: course.id, studentId: student.id },
      },
      update: {},
      create: {
        token: crypto.randomBytes(16).toString("hex"),
        courseId: course.id,
        studentId: student.id,
      },
    });

    const token = tokenRecord.token;

    enrolledCourses.push({
      courseId: course.id,
      courseName: course.name,
      token,
    });
  }

  return NextResponse.json({
    success: true,
    studentId: student.id,
    enrolledCourses,
  });
}
