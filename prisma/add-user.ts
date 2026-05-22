import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import path from "node:path";

const dbPath = path.join(process.cwd(), "dev.db");
const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: `file:${dbPath}` }) });

async function main() {
  const pw = await bcrypt.hash("demo1234", 12);

  // 교수 생성 (예시 데이터 — 실제 사용 시 본인 정보로 교체)
  const prof1 = await prisma.professor.create({
    data: { name: "교수A", email: "profA@example.ac.kr", password: pw },
  });
  const prof2 = await prisma.professor.create({
    data: { name: "교수B", email: "profB@example.ac.kr", password: pw },
  });

  // 강의 생성 (eclassId는 실제 e-class URL의 ?id= 값으로 교체)
  const course1 = await prisma.course.create({
    data: { name: "예시 교양 강의 [A]", semester: "2026-1", category: "교양", studentCount: 40, eclassId: 0, professorId: prof1.id },
  });
  const course2 = await prisma.course.create({
    data: { name: "예시 전공 강의 [A]", semester: "2026-1", category: "컴퓨터과학", studentCount: 35, eclassId: 0, professorId: prof2.id },
  });

  // 학생 생성 (학번/이름은 예시 — 실제 사용 시 교체)
  const student = await prisma.student.upsert({
    where: { studentNo: "0000001" },
    update: { name: "학생A" },
    create: { studentNo: "0000001", name: "학생A" },
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
  console.log("교수: 교수A (profA@example.ac.kr), 교수B (profB@example.ac.kr)");
  console.log("강의: 예시 교양 강의 [A], 예시 전공 강의 [A]");
  console.log("학생: 학생A (0000001)");
  console.log("라운드: 각 1~6주차, 6주차 active");
}

main().catch(console.error).finally(() => prisma.$disconnect());
