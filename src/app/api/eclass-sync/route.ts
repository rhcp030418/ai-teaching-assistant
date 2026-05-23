import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "node:crypto";
import { hashPassword } from "@/lib/auth-utils";

type ValidEclassCourse = { id: number; title: string };
type MatchResult = {
  course: { id: string; name: string; eclassId: number | null };
  matchedBy: "eclassId" | "title" | "autoCreated";
};

function normalizeCourseTitle(title: string) {
  return title
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\bNEW\b/gi, "")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .toLowerCase();
}

function isTitleMatch(eclassTitle: string, courseName: string) {
  const incoming = normalizeCourseTitle(eclassTitle);
  const registered = normalizeCourseTitle(courseName);
  if (!incoming || registered.length < 4) return false;
  return incoming === registered || incoming.startsWith(registered);
}

function autoProvisionEnabled() {
  return process.env.ECLASS_AUTO_PROVISION !== "0";
}

async function getAutoProvisionProfessorId() {
  const email = "eclass-sync@hansung.ac.kr";
  const professor = await prisma.professor.upsert({
    where: { email },
    update: {},
    create: {
      name: "한성대학교 e-class",
      email,
      password: await hashPassword(crypto.randomBytes(18).toString("hex")),
    },
    select: { id: true },
  });
  return professor.id;
}

async function createCourseForEclass(eclassCourse: ValidEclassCourse): Promise<MatchResult | null> {
  if (!autoProvisionEnabled()) return null;

  const professorId = await getAutoProvisionProfessorId();
  const course = await prisma.course.create({
    data: {
      name: eclassCourse.title.trim() || `e-class 과목 ${eclassCourse.id}`,
      semester: "2026-1",
      category: "e-class 동기화",
      eclassId: eclassCourse.id,
      professorId,
      hasAssignment: true,
      hasPractice: true,
    },
    select: { id: true, name: true, eclassId: true },
  });

  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 1);
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + 14);

  await prisma.feedbackRound.create({
    data: {
      courseId: course.id,
      week: 1,
      label: "상시 평가",
      startDate,
      endDate,
    },
  });

  return { course, matchedBy: "autoCreated" };
}

async function findCourseForEclass(eclassCourse: ValidEclassCourse): Promise<MatchResult | null> {
  const byEclassId = await prisma.course.findFirst({
    where: { eclassId: eclassCourse.id },
    select: { id: true, name: true, eclassId: true },
  });

  if (byEclassId) {
    return { course: byEclassId, matchedBy: "eclassId" };
  }

  const titleCandidates = await prisma.course.findMany({
    where: { semester: "2026-1", eclassId: null },
    select: { id: true, name: true, eclassId: true },
  });

  const titleMatched = titleCandidates.find((course) =>
    isTitleMatch(eclassCourse.title, course.name)
  );

  if (!titleMatched) return null;

  const course = await prisma.course.update({
    where: { id: titleMatched.id },
    data: { eclassId: eclassCourse.id },
    select: { id: true, name: true, eclassId: true },
  });

  return { course, matchedBy: "title" };
}

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
    (c): c is ValidEclassCourse =>
      typeof c === "object" &&
      c !== null &&
      typeof (c as { id?: unknown }).id === "number" &&
      typeof (c as { title?: unknown }).title === "string"
  );

  try {
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
    const enrolledCourses: {
      courseId: string;
      courseName: string;
      token: string;
      sourceEclassId: number;
      matchedBy: "eclassId" | "title" | "autoCreated";
    }[] = [];
    const unmatched: { eclassId: number; title: string }[] = [];

    for (const eclassCourse of validCourses) {
      const match = await findCourseForEclass(eclassCourse) ?? await createCourseForEclass(eclassCourse);

      if (!match) {
        unmatched.push({ eclassId: eclassCourse.id, title: eclassCourse.title });
        continue;
      }

      const { course, matchedBy } = match;

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
        sourceEclassId: eclassCourse.id,
        matchedBy,
      });
    }

    return NextResponse.json({
      success: true,
      studentId: student.id,
      enrolledCourses,
      unmatched,
    });
  } catch (err) {
    console.error("[eclass-sync] failed", err);
    return NextResponse.json(
      {
        error:
          "서버 동기화 중 DB 오류가 발생했습니다. 로컬 개발 환경이면 npx prisma db push와 seed 실행 여부를 확인해주세요.",
      },
      { status: 500 }
    );
  }
}
