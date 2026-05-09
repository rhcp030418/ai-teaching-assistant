// 시연용: 박도윤이 만든 커뮤니티 "임의로 만든 강의"를 강의로 등록
// 가짜 교수 계정 (박도윤_prof) 생성 + 박도윤 학생 본인이 수강

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import path from "node:path";

const dbPath = path.join(process.cwd(), "dev.db");
const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: `file:${dbPath}` }) });

async function main() {
  const pw = await bcrypt.hash("demo1234", 12);

  // 가짜 교수 계정
  const fakeProf = await prisma.professor.upsert({
    where: { email: "doyun_demo@hansung.ac.kr" },
    update: {},
    create: { name: "박도윤 (시연용)", email: "doyun_demo@hansung.ac.kr", password: pw },
  });

  // 커뮤니티를 강의로 등록 (eclassId: 46720, 6각형 레이더용 둘 다 true)
  const course = await prisma.course.upsert({
    where: { id: "demo-community-46720" },
    update: {},
    create: {
      id: "demo-community-46720",
      name: "임의로 만든 강의",
      semester: "2026-1",
      category: "교양",
      studentCount: 5,
      eclassId: 46720,
      hasAssignment: true,
      hasPractice: true,
      professorId: fakeProf.id,
    },
  });

  // 박도윤 학생 (이미 등록되어 있으면 그대로 사용)
  const student = await prisma.student.upsert({
    where: { studentNo: "2271018" },
    update: {},
    create: { studentNo: "2271018", name: "박도윤" },
  });

  // 수강 등록
  await prisma.courseStudent.upsert({
    where: { courseId_studentId: { courseId: course.id, studentId: student.id } },
    update: {},
    create: { courseId: course.id, studentId: student.id },
  });

  // 학생 토큰
  await prisma.studentCourseToken.upsert({
    where: { courseId_studentId: { courseId: course.id, studentId: student.id } },
    update: {},
    create: {
      token: crypto.randomBytes(16).toString("hex"),
      courseId: course.id,
      studentId: student.id,
    },
  });

  // 평가 라운드 1~6주차
  // 1~5주차는 과거(종료됨), 6주차는 현재 진행 중 (지금부터 7일)
  const now = new Date();
  for (let week = 1; week <= 6; week++) {
    let startDate: Date;
    let endDate: Date;
    if (week < 6) {
      // 종료된 라운드: week 기준으로 과거 날짜
      const weeksAgo = 6 - week;
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - weeksAgo * 7 - 7);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);
    } else {
      // 진행 중 라운드: 지금부터 7일 후
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 1);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 8);
    }
    await prisma.feedbackRound.upsert({
      where: { courseId_week: { courseId: course.id, week } },
      update: {},
      create: { courseId: course.id, week, label: `${week}주차`, startDate, endDate },
    });
  }

  console.log("시연용 커뮤니티 등록 완료!");
  console.log("강의명: 임의로 만든 강의");
  console.log("교수: 박도윤 (시연용) / doyun_demo@hansung.ac.kr / demo1234");
  console.log("eclassId: 46720");
  console.log("학생: 박도윤 (2271018) 자동 수강 등록");
  console.log("라운드: 1~6주차, 6주차 active");
  console.log("hasAssignment: true, hasPractice: true → 6각형 레이더 차트");
}

main().catch(console.error).finally(() => prisma.$disconnect());
