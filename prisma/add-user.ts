import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import path from "node:path";

const dbPath = path.join(process.cwd(), "dev.db");
const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: `file:${dbPath}` }) });

async function main() {
  const pw = await bcrypt.hash("demo1234", 12);

  // 교수 생성
  const 어지원 = await prisma.professor.create({
    data: { name: "어지원", email: "eo@hansung.ac.kr", password: pw },
  });
  const 석병진 = await prisma.professor.create({
    data: { name: "석병진", email: "seok@hansung.ac.kr", password: pw },
  });

  // 강의 생성 (eclassId 포함)
  const course1 = await prisma.course.create({
    data: { name: "돈의 흐름 이해하기 [A]", semester: "2026-1", category: "교양", studentCount: 40, eclassId: 44780, professorId: 어지원.id },
  });
  const course2 = await prisma.course.create({
    data: { name: "웹 프로그래밍 [A]", semester: "2026-1", category: "컴퓨터과학", studentCount: 35, eclassId: 0, professorId: 석병진.id },
  });

  // 학생 생성
  const student = await prisma.student.upsert({
    where: { studentNo: "2271018" },
    update: { name: "박도윤" },
    create: { studentNo: "2271018", name: "박도윤" },
  });

  // 수강 등록 + 토큰 발급
  for (const course of [course1, course2]) {
    await prisma.courseStudent.create({ data: { courseId: course.id, studentId: student.id } });
    await prisma.studentCourseToken.create({
      data: { token: crypto.randomBytes(16).toString("hex"), courseId: course.id, studentId: student.id },
    });
  }

  // 라운드 생성: 1~5주차는 과거(종료), 6주차는 진행 중
  const now = new Date();
  for (const course of [course1, course2]) {
    for (let week = 1; week <= 6; week++) {
      let startDate: Date;
      let endDate: Date;
      if (week < 6) {
        const weeksAgo = 6 - week;
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - weeksAgo * 7 - 7);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 7);
      } else {
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 1);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 8);
      }
      await prisma.feedbackRound.create({
        data: { courseId: course.id, week, label: `${week}주차`, startDate, endDate },
      });
    }
  }

  console.log("Done!");
  console.log("교수: 어지원 (eo@hansung.ac.kr), 석병진 (seok@hansung.ac.kr)");
  console.log("강의: 돈의 흐름 이해하기 [A] (eclassId:44780), 웹 프로그래밍 [A] (eclassId:0)");
  console.log("학생: 박도윤 (2271018)");
  console.log("라운드: 각 1~6주차, 6주차 active");
}

main().catch(console.error).finally(() => prisma.$disconnect());
