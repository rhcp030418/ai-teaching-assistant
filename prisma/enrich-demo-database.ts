import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import crypto from "node:crypto";
import path from "node:path";
import { backfillFeedbackRedesignFields } from "./feedback-redesign-backfill";

const dbUrl = process.env.DATABASE_URL ?? `file:${path.join(process.cwd(), "dev.db")}`;
const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: dbUrl }),
});

const COURSE_NAME = "데이터베이스";
const SEMESTER = "2026-1";
const TARGET_STUDENT_COUNT = 40;
const ROUND_TARGETS = [22, 24, 23, 25, 26, 28];
const SUBMISSION_TARGETS = [30, 32, 31, 34, 35, 32];

const feedbackTemplates = [
  {
    speed: "moderate",
    comprehension: "high",
    communication: 5,
    interest: 5,
    assignment: 4,
    comment: "실습 예시를 같이 보니까 개념이 훨씬 잘 잡혔습니다.",
    filteredComment: "실습 예시를 같이 보니까 개념이 훨씬 잘 잡혔습니다.",
    commentCategory: "학습",
    commentFilterReason: "실습 예시에 대한 긍정적 피드백",
  },
  {
    speed: "moderate",
    comprehension: "high",
    communication: 4,
    interest: 4,
    assignment: 4,
    comment: "ERD 예시가 한 학기 내내 이어져서 새 개념을 배울 때마다 부담이 줄었습니다.",
    filteredComment: "ERD 예시가 한 학기 내내 이어져서 새 개념을 배울 때마다 부담이 줄었습니다.",
    commentCategory: "학습",
    commentFilterReason: "일관된 예제 데이터에 대한 긍정적 피드백",
  },
  {
    speed: "fast",
    comprehension: "medium",
    communication: 3,
    interest: 4,
    assignment: 3,
    comment: "과제에서 어디까지 작성해야 하는지 예시가 있으면 좋겠습니다.",
    filteredComment: "과제에서 어디까지 작성해야 하는지 예시가 있으면 좋겠습니다.",
    commentCategory: "학습",
    commentFilterReason: "과제 기준에 대한 건설적 요청",
  },
  {
    speed: "moderate",
    comprehension: "medium",
    communication: 4,
    interest: 4,
    assignment: 3,
    comment: "SQL과 NoSQL 비교 표가 도움이 됐고, 다음에는 쿼리 결과를 더 오래 보여주시면 좋겠습니다.",
    filteredComment: "SQL과 NoSQL 비교 표가 도움이 됐고, 다음에는 쿼리 결과를 더 오래 보여주시면 좋겠습니다.",
    commentCategory: "학습",
    commentFilterReason: "자료 구성과 진행 속도에 대한 균형 피드백",
  },
  {
    speed: "slow",
    comprehension: "high",
    communication: 5,
    interest: 5,
    assignment: 4,
    comment: "EXPLAIN 결과를 직접 비교해주신 부분이 가장 기억에 남았습니다.",
    filteredComment: "EXPLAIN 결과를 직접 비교해주신 부분이 가장 기억에 남았습니다.",
    commentCategory: "학습",
    commentFilterReason: "성능 시연에 대한 긍정적 피드백",
  },
  {
    speed: "fast",
    comprehension: "low",
    communication: 2,
    interest: 3,
    assignment: 2,
    comment: "집계 파이프라인은 한 번에 다루는 내용이 많아서 복습 자료가 있으면 좋겠습니다.",
    filteredComment: "집계 파이프라인은 한 번에 다루는 내용이 많아서 복습 자료가 있으면 좋겠습니다.",
    commentCategory: "학습",
    commentFilterReason: "심화 내용 복습 자료 요청",
  },
] as const;

const roundProfiles: Record<number, {
  speedModerateRatio: number;
  comprehensionHighRatio: number;
  materialHelpAvg: number;
  communicationAvg: number;
  interestAvg: number;
  assignmentAvg: number;
  practiceAvg: number;
  positive: string;
  difficulty: string;
}> = {
  1: {
    speedModerateRatio: 0.18,
    comprehensionHighRatio: 0.2,
    materialHelpAvg: 2.2,
    communicationAvg: 2.2,
    interestAvg: 2.3,
    assignmentAvg: 2.1,
    practiceAvg: 2.2,
    positive: "기본 개념을 천천히 다시 짚어주신 부분은 도움이 되었습니다.",
    difficulty: "초반 용어가 한꺼번에 나와서 예시와 정리 자료가 더 필요했습니다.",
  },
  2: {
    speedModerateRatio: 0.38,
    comprehensionHighRatio: 0.42,
    materialHelpAvg: 3.0,
    communicationAvg: 3.0,
    interestAvg: 3.1,
    assignmentAvg: 3.2,
    practiceAvg: 3.0,
    positive: "ERD 예제를 같이 보면서 개념 흐름을 잡는 데 도움이 되었습니다.",
    difficulty: "관계형 모델로 넘어가는 부분에서 속도가 조금 빨라 복습 시간이 필요했습니다.",
  },
  3: {
    speedModerateRatio: 0.62,
    comprehensionHighRatio: 0.64,
    materialHelpAvg: 3.7,
    communicationAvg: 3.7,
    interestAvg: 3.8,
    assignmentAvg: 3.6,
    practiceAvg: 3.5,
    positive: "SQL 예시가 점점 익숙해져서 수업 흐름을 따라가기 좋아졌습니다.",
    difficulty: "서브쿼리와 조인 차이는 추가 예제가 있으면 더 확실히 이해될 것 같습니다.",
  },
  4: {
    speedModerateRatio: 0.82,
    comprehensionHighRatio: 0.82,
    materialHelpAvg: 4.4,
    communicationAvg: 4.3,
    interestAvg: 4.2,
    assignmentAvg: 4.1,
    practiceAvg: 4.4,
    positive: "정규화 예시와 실습 흐름이 명확해서 가장 이해가 잘 된 주차였습니다.",
    difficulty: "큰 어려움은 없었고 과제 예시 범위만 한 번 더 안내되면 좋겠습니다.",
  },
  5: {
    speedModerateRatio: 0.55,
    comprehensionHighRatio: 0.48,
    materialHelpAvg: 3.4,
    communicationAvg: 3.8,
    interestAvg: 3.3,
    assignmentAvg: 2.4,
    practiceAvg: 4.0,
    positive: "인덱스 실습은 직접 결과 차이를 확인할 수 있어서 좋았습니다.",
    difficulty: "과제 기준이 다소 모호했고 성능 분석 결과를 해석하는 부분이 어려웠습니다.",
  },
  6: {
    speedModerateRatio: 0.68,
    comprehensionHighRatio: 0.7,
    materialHelpAvg: 4.1,
    communicationAvg: 4.1,
    interestAvg: 3.9,
    assignmentAvg: 3.3,
    practiceAvg: 4.2,
    positive: "MongoDB와 SQL을 비교해주셔서 새 개념을 연결해서 이해할 수 있었습니다.",
    difficulty: "집계 파이프라인 단계가 많아서 복습용 예시가 더 있으면 좋겠습니다.",
  },
};

function scoreFromAverage(avg: number, index: number) {
  const low = Math.floor(avg);
  const high = Math.ceil(avg);
  if (low === high) return Math.min(5, Math.max(1, low));
  const highRatio = avg - low;
  return index % 10 < Math.round(highRatio * 10) ? high : low;
}

function demoFeedbackForRound(week: number, index: number, total: number) {
  const profile = roundProfiles[week] ?? roundProfiles[6];
  const moderateCount = Math.round(total * profile.speedModerateRatio);
  const highCount = Math.round(total * profile.comprehensionHighRatio);
  const mediumCount = Math.round(total * 0.35);
  const speed =
    index < moderateCount
      ? "moderate"
      : index % 5 === 0
        ? "very_fast"
        : index % 3 === 0
          ? "very_slow"
          : index % 2 === 0
            ? "fast"
            : "slow";
  const comprehension =
    index < highCount ? "5" : index < highCount + mediumCount ? "3" : "2";
  const positiveComment = index % 4 === 0 ? profile.positive : null;
  const difficultyComment = index % 3 === 0 ? profile.difficulty : null;
  const comment = [positiveComment && `좋았던 점: ${positiveComment}`, difficultyComment && `어려웠던 점: ${difficultyComment}`]
    .filter(Boolean)
    .join("\n\n") || profile.difficulty;

  return {
    speed,
    comprehension,
    materialHelp: scoreFromAverage(profile.materialHelpAvg, index),
    communication: scoreFromAverage(profile.communicationAvg, index),
    interest: scoreFromAverage(profile.interestAvg, index),
    assignment: scoreFromAverage(profile.assignmentAvg, index),
    practice: scoreFromAverage(profile.practiceAvg, index),
    positiveComment,
    difficultyComment,
    activityPoints: 1 + (positiveComment ? 1 : 0) + (difficultyComment ? 1 : 0),
    comment,
    filteredComment: comment,
    commentCategory: "학습",
    commentFilterReason: "데모 분포 확인용 학습 피드백",
  };
}

function closedRoundDates(week: number) {
  const startDate = new Date("2026-04-01T09:00:00+09:00");
  startDate.setDate(startDate.getDate() + (week - 1) * 7);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);
  endDate.setHours(23, 59, 0, 0);
  return { startDate, endDate };
}

function materialAnalysis(week: number) {
  return JSON.stringify({
    difficulty: week >= 5 ? "보통~높음" : "보통",
    difficultyReason:
      week >= 5
        ? "인덱스, 트리거, 집계 파이프라인처럼 절차와 원리를 함께 이해해야 하는 내용이 포함되어 있습니다."
        : "핵심 개념은 명확하지만 처음 접하는 용어가 있어 예시와 표가 함께 제시될 때 이해가 쉽습니다.",
    termDensity: week >= 5 ? "높음" : "중간",
    exampleSufficiency: week >= 4 ? "충분" : "보완 가능",
    improvements: {
      structure: "수업 말미에 핵심 흐름을 한 장으로 다시 정리하면 학생들이 복습 포인트를 잡기 쉽습니다.",
      examples: "과제 기준과 예시 답안의 범위를 함께 보여주면 반복 질문을 줄일 수 있습니다.",
      pedagogy: "실습 전 예상 결과를 먼저 보여주고, 이후 쿼리를 직접 실행하는 순서가 이해를 돕습니다.",
    },
  });
}

async function ensureStudents(courseId: string) {
  const existing = await prisma.courseStudent.findMany({
    where: { courseId },
    select: { studentId: true },
  });
  const existingIds = new Set(existing.map((row) => row.studentId));

  for (let i = 1; i <= TARGET_STUDENT_COUNT; i++) {
    const studentNo = `DBDEMO${String(i).padStart(3, "0")}`;
    const student = await prisma.student.upsert({
      where: { studentNo },
      update: {},
      create: {
        studentNo,
        name: `데모학생${i}`,
        email: `dbdemo${i}@hansung.ac.kr`,
        department: i % 3 === 0 ? "소프트웨어학과" : "컴퓨터공학과",
      },
    });

    if (!existingIds.has(student.id)) {
      await prisma.courseStudent.create({
        data: { courseId, studentId: student.id },
      });
    }

    await prisma.studentCourseToken.upsert({
      where: { courseId_studentId: { courseId, studentId: student.id } },
      update: {},
      create: {
        courseId,
        studentId: student.id,
        token: crypto.randomBytes(16).toString("hex"),
      },
    });
  }

  return prisma.courseStudent.findMany({
    where: { courseId },
    orderBy: { createdAt: "asc" },
    select: { studentId: true },
  });
}

async function main() {
  const course = await prisma.course.findFirst({
    where: { name: COURSE_NAME, semester: SEMESTER },
    include: { feedbackRounds: { orderBy: { week: "asc" } } },
  });

  if (!course) {
    console.log(`${COURSE_NAME} ${SEMESTER} course not found. Demo enrichment skipped.`);
    return;
  }

  await prisma.course.update({
    where: { id: course.id },
    data: {
      studentCount: TARGET_STUDENT_COUNT,
      aiSummary:
        "실습 예시와 일관된 예제 데이터가 이해에 도움이 되었다는 의견이 많습니다. 다만 과제 기준과 집계 파이프라인 복습 자료에 대한 요청이 반복되어, 다음 수업에서는 예시 답안의 범위와 핵심 절차를 함께 안내하면 좋겠습니다.",
    },
  });

  const students = await ensureStudents(course.id);

  for (const round of course.feedbackRounds) {
    if (round.week === 6) {
      await prisma.feedbackRound.update({
        where: { id: round.id },
        data: {
          label: "6주차",
          startDate: new Date("2026-05-20T09:00:00+09:00"),
          endDate: new Date("2026-05-29T23:59:00+09:00"),
        },
      });
    }

    if (round.week >= 1 && round.week <= 5) {
      const { startDate, endDate } = closedRoundDates(round.week);
      await prisma.feedbackRound.update({
        where: { id: round.id },
        data: {
          label: `${round.week}주차`,
          startDate,
          endDate,
        },
      });
    }

    const target = ROUND_TARGETS[round.week - 1] ?? 20;
    const current = await prisma.feedback.count({ where: { roundId: round.id } });
    const toCreate = Math.max(0, target - current);
    if (toCreate > 0) {
      await prisma.feedback.createMany({
        data: Array.from({ length: toCreate }, (_, index) => {
          const template = feedbackTemplates[(index + round.week) % feedbackTemplates.length];
          return {
            courseId: course.id,
            roundId: round.id,
            ...template,
            ...demoFeedbackForRound(round.week, current + index, target),
          };
        }),
      });
    }

    const roundFeedbacks = await prisma.feedback.findMany({
      where: { roundId: round.id },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    for (const [index, feedback] of roundFeedbacks.entries()) {
      await prisma.feedback.update({
        where: { id: feedback.id },
        data: demoFeedbackForRound(round.week, index, roundFeedbacks.length),
      });
    }

    const submissionTarget = SUBMISSION_TARGETS[round.week - 1] ?? target;
    for (const { studentId } of students.slice(0, submissionTarget)) {
      await prisma.submissionLog.upsert({
        where: { studentId_courseId_roundId: { studentId, courseId: course.id, roundId: round.id } },
        update: {},
        create: { studentId, courseId: course.id, roundId: round.id },
      });
    }
  }

  for (let week = 1; week <= 6; week++) {
    const round = course.feedbackRounds.find((r) => r.week === week);
    if (!round) continue;

    const existing = await prisma.lectureMaterial.findFirst({
      where: { courseId: course.id, fileName: { contains: `${week}주차` } },
    });

    if (existing) {
      await prisma.lectureMaterial.update({
        where: { id: existing.id },
        data: {
          roundId: round.id,
          analysis: materialAnalysis(week),
          analysisUpdatedAt: new Date(),
        },
      });
    } else {
      await prisma.lectureMaterial.create({
        data: {
          courseId: course.id,
          roundId: round.id,
          fileName: `데이터베이스_${week}주차_강의자료.pdf`,
          filePath: `데이터베이스_${week}주차_강의자료.pdf`,
          analysis: materialAnalysis(week),
          analysisUpdatedAt: new Date(),
        },
      });
    }
  }

  const tokenCount = await prisma.feedbackToken.count({ where: { courseId: course.id } });
  if (tokenCount < TARGET_STUDENT_COUNT) {
    await prisma.feedbackToken.createMany({
      data: Array.from({ length: TARGET_STUDENT_COUNT - tokenCount }, (_, index) => ({
        courseId: course.id,
        token: `demo-db-token-${index}-${crypto.randomBytes(8).toString("hex")}`,
        used: index < 8,
      })),
    });
  }

  const activeRound = await prisma.feedbackRound.findFirst({
    where: {
      courseId: course.id,
      startDate: { lte: new Date() },
      endDate: { gt: new Date() },
    },
    include: { _count: { select: { feedbacks: true, submissions: true } } },
  });

  const feedbackBackfill = await backfillFeedbackRedesignFields(prisma);

  console.log("Demo database enriched.");
  console.log(`Course: ${COURSE_NAME} (${course.id})`);
  console.log(`Students: ${students.length}`);
  console.log(`Feedback redesign fields: ${feedbackBackfill.updated}/${feedbackBackfill.checked} updated`);
  if (activeRound) {
    console.log(
      `Active round: ${activeRound.label ?? `${activeRound.week}주차`} / feedbacks ${activeRound._count.feedbacks} / submissions ${activeRound._count.submissions}`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
