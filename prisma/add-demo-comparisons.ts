// 시연용: 데모 강의 "임의로 만든 강의" 비교 데이터 추가
// 1) 데모 강의에 직접 피드백 여러 개 (종료된 라운드 1~5주차에 분배)
// 2) 동일 카테고리(교양) 2026-1 비교 교수 강의 4개 (벤치마크용)
// 3) 그 중 일부는 2025-2에도 강의를 운영했고 점수 향상 (개선 사례용)

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import path from "node:path";

const dbPath = path.join(process.cwd(), "dev.db");
const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: `file:${dbPath}` }) });

type Bias = "low" | "mid" | "high";

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickWeighted<T>(items: T[], weights: number[]): T {
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < items.length; i++) {
    cumulative += weights[i];
    if (r < cumulative) return items[i];
  }
  return items[items.length - 1];
}

function generateFeedback(bias: Bias) {
  const speedWeights: Record<Bias, number[]> = {
    low: [0.5, 0.3, 0.2],
    mid: [0.25, 0.5, 0.25],
    high: [0.15, 0.7, 0.15],
  };
  const compWeights: Record<Bias, number[]> = {
    low: [0.1, 0.3, 0.6],
    mid: [0.3, 0.5, 0.2],
    high: [0.6, 0.3, 0.1],
  };
  const commRanges: Record<Bias, [number, number]> = {
    low: [1, 3],
    mid: [2, 4],
    high: [3, 5],
  };

  const [cMin, cMax] = commRanges[bias];

  return {
    speed: pickWeighted(["fast", "moderate", "slow"], speedWeights[bias]),
    comprehension: pickWeighted(["high", "medium", "low"], compWeights[bias]),
    communication: rand(cMin, cMax),
    interest: rand(cMin, cMax),
    assignment: rand(cMin, cMax),
    practice: rand(cMin, cMax),
    comment: null,
    filteredComment: null,
    commentCategory: null,
    commentFilterReason: null,
  };
}

// 데모 강의가 1~5주차는 종료, 6주차는 진행 중인 상태이므로
// 종료된 5개 라운드(1~5주차)에 피드백을 분배해서 넣는다.
async function main() {
  const pw = await bcrypt.hash("demo1234", 12);

  // ─── 1) 데모 강의에 피드백 여러 개 ───
  const demoCourse = await prisma.course.findFirst({
    where: { name: "임의로 만든 강의" },
    include: {
      feedbackRounds: { orderBy: { week: "asc" } },
    },
  });

  if (!demoCourse) {
    console.error("'임의로 만든 강의'를 찾을 수 없습니다. add-demo-community.ts 먼저 실행하세요.");
    return;
  }

  // 종료된 라운드 (1~5주차)에 분배
  const closedRounds = demoCourse.feedbackRounds.filter((r) => r.endDate <= new Date());
  // 진행 중 라운드 (6주차) - 여기에도 피드백 일부 추가
  const activeRound = demoCourse.feedbackRounds.find((r) => r.startDate <= new Date() && r.endDate > new Date());

  // 데모 강의 시나리오: 초반 약함 → 후반 향상 (학기 진행하며 개선)
  const demoBiasByWeek: Bias[] = ["low", "mid", "mid", "high", "high"];

  let demoFeedbackCount = 0;
  for (let i = 0; i < closedRounds.length; i++) {
    const round = closedRounds[i];
    const bias = demoBiasByWeek[i] ?? "mid";
    const count = rand(8, 14);
    await prisma.feedback.createMany({
      data: Array.from({ length: count }, () => ({
        courseId: demoCourse.id,
        roundId: round.id,
        ...generateFeedback(bias),
      })),
    });
    demoFeedbackCount += count;
  }

  // 진행 중 라운드에도 일부
  if (activeRound) {
    const activeCount = rand(3, 6);
    await prisma.feedback.createMany({
      data: Array.from({ length: activeCount }, () => ({
        courseId: demoCourse.id,
        roundId: activeRound.id,
        ...generateFeedback("high"),
      })),
    });
    demoFeedbackCount += activeCount;
  }

  // ─── 2) 비교용 교수 4명 (2026-1 교양 강의, 벤치마크용) ───
  const profData = [
    { name: "최서윤", email: "choi_seoyun@hansung.ac.kr", course2026: "현대사회와 미디어", bias2026: "high" as Bias },
    { name: "이상훈", email: "lee_sanghoon@hansung.ac.kr", course2026: "철학과 삶", bias2026: "mid" as Bias },
    { name: "박은지", email: "park_eunji@hansung.ac.kr", course2026: "예술의 이해", bias2026: "high" as Bias },
    { name: "정태현", email: "jung_taehyun@hansung.ac.kr", course2026: "심리학 입문", bias2026: "mid" as Bias },
  ];

  // 2025-2 데이터: 일부 교수는 점수가 낮았다가 향상 (개선 사례)
  const prevData: Record<string, { name: string; bias: Bias } | null> = {
    "최서윤": { name: "현대 사회의 이해", bias: "low" },   // 큰 향상
    "이상훈": { name: "윤리학 개론", bias: "low" },        // 큰 향상
    "박은지": { name: "음악사", bias: "mid" },             // 약간 향상
    "정태현": null,                                          // 2025-2 강의 없음
  };

  let totalCompFeedback = 0;
  for (const p of profData) {
    const prof = await prisma.professor.upsert({
      where: { email: p.email },
      update: { name: p.name },
      create: { name: p.name, email: p.email, password: pw },
    });

    // 2026-1 강의
    const curr = await prisma.course.create({
      data: {
        name: p.course2026,
        semester: "2026-1",
        category: "교양",
        studentCount: rand(25, 40),
        hasAssignment: true,
        hasPractice: false,
        professorId: prof.id,
      },
    });
    const currCount = rand(15, 25);
    await prisma.feedback.createMany({
      data: Array.from({ length: currCount }, () => ({
        courseId: curr.id,
        ...generateFeedback(p.bias2026),
      })),
    });
    totalCompFeedback += currCount;

    // 2025-2 강의 (있는 경우)
    const prev = prevData[p.name];
    if (prev) {
      const prevCourse = await prisma.course.create({
        data: {
          name: prev.name,
          semester: "2025-2",
          category: "교양",
          studentCount: rand(25, 40),
          hasAssignment: true,
          hasPractice: false,
          professorId: prof.id,
        },
      });
      const prevCount = rand(15, 25);
      await prisma.feedback.createMany({
        data: Array.from({ length: prevCount }, () => ({
          courseId: prevCourse.id,
          ...generateFeedback(prev.bias),
        })),
      });
      totalCompFeedback += prevCount;
    }
  }

  console.log("시연용 비교 데이터 추가 완료!");
  console.log(`\n[데모 강의 피드백] ${demoFeedbackCount}건 (종료된 1~5주차 + 진행 중 6주차)`);
  console.log(`  → 학기 초반 낮음 → 후반 향상 시나리오`);
  console.log(`\n[비교 교수 4명 (교양, 2026-1)]`);
  for (const p of profData) {
    const hasprev = prevData[p.name] ? " + 2025-2 강의" : "";
    console.log(`  - ${p.name}: ${p.course2026} (${p.bias2026})${hasprev}`);
  }
  console.log(`\n[개선 사례 후보]`);
  console.log(`  - 최서윤: 현대 사회의 이해(low) → 현대사회와 미디어(high) ★`);
  console.log(`  - 이상훈: 윤리학 개론(low) → 철학과 삶(mid)`);
  console.log(`  - 박은지: 음악사(mid) → 예술의 이해(high)`);
  console.log(`\n총 비교용 피드백: ${totalCompFeedback}건`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
