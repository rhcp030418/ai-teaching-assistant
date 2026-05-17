import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "node:crypto";

// 크롬 확장에서 학생 정보 + 수강 과목 수신
// → Student upsert + CourseStudent 등록 + StudentCourseToken 자동 발급
export async function POST(req: NextRequest) {
  let body: { userInfo?: { name?: string; studentId?: string; email?: string; department?: string }; courses?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const { userInfo, courses } = body;

  if (!userInfo?.studentId || !userInfo?.name) {
    return NextResponse.json({ error: "학번과 이름은 필수입니다." }, { status: 400 });
  }

  if (!Array.isArray(courses)) {
    return NextResponse.json({ error: "courses 필드가 올바르지 않습니다." }, { status: 400 });
  }

  const validCourses = (courses as unknown[]).filter(
    (c): c is { id: number; title: string } =>
      typeof c === "object" && c !== null && typeof (c as { id?: unknown }).id === "number"
  );

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

  for (const eclassCourse of validCourses) {
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
