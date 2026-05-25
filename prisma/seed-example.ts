/**
 * 예시 데이터 시드 (선택) — `npm run seed:example` 로 실행.
 *
 * 관리자 계정(ADMIN_EMAIL) 아래에 예시 강의 1개 + 종료된 평가 회차 2개 +
 * 익명 피드백 몇 건을 만들어, 대시보드 화면(요약·차트·회차 리포트·추이)이
 * 어떻게 채워지는지 빠르게 확인할 수 있게 한다.
 *
 * 실제 운영 데이터와 무관한 샘플이므로 언제든 지워도 된다.
 * 이미 예시 강의가 있으면 다시 만들지 않는다(idempotent).
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "node:path";

const dbUrl = process.env.DATABASE_URL ?? `file:${path.join(process.cwd(), "dev.db")}`;
const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: dbUrl }),
});

const EXAMPLE_COURSE_NAME = "예시 강의 (샘플 데이터)";

// 한 회차에 넣을 피드백 묶음. comprehension/speed 는 문자열, 점수는 1~5 정수.
function buildFeedbacks(courseId: string, roundId: string, bias: "mid" | "high") {
  const rows = [
    { speed: "moderate", comprehension: "4", communication: 4, interest: 4, materialHelp: 4, assignment: 4, practice: 4,
      positive: "실습 예시가 많아 개념이 잘 잡혔습니다.", difficulty: "새 용어가 한 번에 많이 나올 때는 조금 빠르게 느껴졌어요." },
    { speed: "moderate", comprehension: "5", communication: 5, interest: 5, materialHelp: 5, assignment: 4, practice: 5,
      positive: "질문할 시간이 충분해서 좋았습니다.", difficulty: null },
    { speed: "fast", comprehension: "3", communication: 3, interest: 3, materialHelp: 3, assignment: 3, practice: 3,
      positive: null, difficulty: "진도가 조금 빨라서 필기를 따라가기 어려웠습니다." },
    { speed: "moderate", comprehension: "4", communication: 4, interest: 4, materialHelp: 4, assignment: 4, practice: 4,
      positive: "예제 코드를 직접 돌려볼 수 있어 이해가 쉬웠어요.", difficulty: null },
    { speed: "slow", comprehension: "4", communication: 4, interest: 3, materialHelp: 4, assignment: 3, practice: 4,
      positive: null, difficulty: null },
    { speed: "moderate", comprehension: bias === "high" ? "5" : "4", communication: bias === "high" ? 5 : 4,
      interest: 4, materialHelp: 4, assignment: 4, practice: 4, positive: "복습 자료가 정리가 잘 되어 있습니다.", difficulty: null },
    { speed: "moderate", comprehension: bias === "high" ? "4" : "3", communication: 4, interest: 4, materialHelp: 4,
      assignment: 4, practice: 4, positive: null, difficulty: "과제 안내가 조금 더 구체적이면 좋겠어요." },
    { speed: "fast", comprehension: bias === "high" ? "4" : "3", communication: 3, interest: 3, materialHelp: 3,
      assignment: 3, practice: 3, positive: null, difficulty: null },
  ];

  return rows.map((r) => {
    const comment = r.positive ?? r.difficulty ?? null;
    return {
      courseId,
      roundId,
      speed: r.speed,
      comprehension: r.comprehension,
      communication: r.communication,
      interest: r.interest,
      materialHelp: r.materialHelp,
      assignment: r.assignment,
      practice: r.practice,
      positiveComment: r.positive,
      difficultyComment: r.difficulty,
      comment,
      // 코멘트가 있으면 학습 코멘트로 분류해 대시보드에 그대로 표시되게 한다.
      filteredComment: comment,
      commentCategory: comment ? "학습" : null,
      commentFilterReason: comment ? "예시 데이터" : null,
      activityPoints: 1 + (r.positive ? 1 : 0) + (r.difficulty ? 1 : 0),
    };
  });
}

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const professor = await prisma.professor.findUnique({ where: { email } });
  if (!professor) {
    console.error(
      `[seed:example] 관리자 계정(${email})이 없습니다. 먼저 \`npm run db:seed\` 또는 \`npm run setup\` 을 실행하세요.`,
    );
    process.exit(1);
  }

  const existing = await prisma.course.findFirst({
    where: { professorId: professor.id, name: EXAMPLE_COURSE_NAME },
  });
  if (existing) {
    console.log("[seed:example] 예시 강의가 이미 있어 건너뜁니다.");
    return;
  }

  const course = await prisma.course.create({
    data: {
      name: EXAMPLE_COURSE_NAME,
      semester: "2026-1",
      category: "컴퓨터과학",
      studentCount: 30,
      hasAssignment: true,
      hasPractice: true,
      professorId: professor.id,
    },
  });

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  // 종료된 회차 2개 (추이 차트가 보이도록)
  const round1 = await prisma.feedbackRound.create({
    data: {
      courseId: course.id,
      week: 1,
      label: "1주차",
      startDate: new Date(now - 21 * day),
      endDate: new Date(now - 14 * day),
    },
  });
  const round2 = await prisma.feedbackRound.create({
    data: {
      courseId: course.id,
      week: 2,
      label: "2주차",
      startDate: new Date(now - 14 * day),
      endDate: new Date(now - 7 * day),
    },
  });

  await prisma.feedback.createMany({
    data: [
      ...buildFeedbacks(course.id, round1.id, "mid"),
      ...buildFeedbacks(course.id, round2.id, "high"),
    ],
  });

  const total = await prisma.feedback.count({ where: { courseId: course.id } });
  console.log(`[seed:example] 예시 강의 생성 완료: ${EXAMPLE_COURSE_NAME}`);
  console.log(`[seed:example] 회차 2개 · 피드백 ${total}건 (${email} 계정으로 로그인해 확인).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
