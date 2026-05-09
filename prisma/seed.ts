import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import path from "node:path";

const dbPath = path.join(process.cwd(), "dev.db");
const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: `file:${dbPath}` }),
});

// bias: "low" = mostly 1~3, "high" = mostly 3~5, "mid" = mostly 2~4, "neutral" = random
type Bias = "low" | "high" | "mid" | "neutral";

function randomFeedbacks(count: number, bias: Bias = "neutral") {
  const speeds = ["fast", "moderate", "slow"];
  const comprehensions = ["high", "medium", "low"];

  const commRanges: Record<Bias, () => number> = {
    low: () => Math.random() < 0.7 ? Math.floor(Math.random() * 2) + 1 : Math.floor(Math.random() * 2) + 3,
    high: () => Math.random() < 0.7 ? Math.floor(Math.random() * 2) + 4 : Math.floor(Math.random() * 2) + 2,
    mid: () => Math.random() < 0.6 ? Math.floor(Math.random() * 2) + 3 : (Math.random() < 0.5 ? 1 : 5),
    neutral: () => Math.floor(Math.random() * 5) + 1,
  };

  const speedWeights: Record<Bias, number[]> = {
    low: [0.5, 0.3, 0.2],
    high: [0.1, 0.75, 0.15],
    mid: [0.25, 0.5, 0.25],
    neutral: [0.33, 0.34, 0.33],
  };

  const compWeights: Record<Bias, number[]> = {
    low: [0.1, 0.3, 0.6],
    high: [0.6, 0.3, 0.1],
    mid: [0.3, 0.5, 0.2],
    neutral: [0.33, 0.34, 0.33],
  };

  function weightedPick(options: string[], weights: number[]) {
    const r = Math.random();
    let cumulative = 0;
    for (let i = 0; i < options.length; i++) {
      cumulative += weights[i];
      if (r < cumulative) return options[i];
    }
    return options[options.length - 1];
  }

  // { comment, category, filtered, reason }
  const commentPool: { text: string | null; category: string | null; filtered: string | null; reason: string | null }[] = [
    { text: null, category: null, filtered: null, reason: null },
    { text: null, category: null, filtered: null, reason: null },
    { text: null, category: null, filtered: null, reason: null },
    { text: null, category: null, filtered: null, reason: null },
    { text: null, category: null, filtered: null, reason: null },
    // 학습 코멘트
    { text: "수업이 전반적으로 좋습니다.", category: "학습", filtered: "수업이 전반적으로 좋습니다.", reason: "수업 전반에 대한 긍정적 피드백" },
    { text: "더 많은 예시가 있으면 좋겠습니다.", category: "학습", filtered: "더 많은 예시가 있으면 좋겠습니다.", reason: "자료 개선에 대한 건설적 요청" },
    { text: "실습 시간이 부족합니다.", category: "학습", filtered: "실습 시간이 부족합니다.", reason: "수업 구성에 대한 건설적 피드백" },
    { text: "설명이 명확합니다.", category: "학습", filtered: "설명이 명확합니다.", reason: "강의 방식에 대한 긍정적 피드백" },
    { text: "자료가 좀 어렵습니다.", category: "학습", filtered: "자료가 좀 어렵습니다.", reason: "자료 난이도에 대한 건설적 피드백" },
    { text: "질문에 잘 답해주십니다.", category: "학습", filtered: "질문에 잘 답해주십니다.", reason: "소통에 대한 긍정적 피드백" },
    { text: "속도 조절이 필요합니다.", category: "학습", filtered: "속도 조절이 필요합니다.", reason: "수업 속도에 대한 건설적 피드백" },
    { text: "과제 피드백이 도움이 됩니다.", category: "학습", filtered: "과제 피드백이 도움이 됩니다.", reason: "과제 운영에 대한 긍정적 피드백" },
    // 감정 코멘트 — 필터링 테스트용
    { text: "교수 진짜 개무능 ㅋㅋ 이딴 강의를 돈 받고 하냐", category: "감정", filtered: null, reason: "인신공격 및 비하 표현" },
    { text: "수업 존나 지루함. 차라리 유튜브 보는 게 나음", category: "감정", filtered: null, reason: "비속어 및 비건설적 불만" },
    { text: "이 교수 짤려야 됨 ㅅㄱ", category: "감정", filtered: null, reason: "인신공격" },
    { text: "시발 뭔 소린지 하나도 모르겠음", category: "감정", filtered: null, reason: "비속어 사용" },
    { text: "병신같은 과제 내지 마세요 시간낭비임", category: "혼합", filtered: "과제 구성을 개선해주시면 좋겠습니다.", reason: "과제에 대한 불만이 있으나 비속어 포함" },
    { text: "교수가 학생을 무시하는 태도가 역겹다", category: "혼합", filtered: "학생 의견을 더 존중해주시면 좋겠습니다.", reason: "소통 불만이 있으나 감정적 표현 포함" },
    { text: "이런 쓰레기 강의 처음 봄 ㄹㅇ", category: "감정", filtered: null, reason: "비하 표현 및 비건설적 불만" },
    { text: "찐으로 최악의 교수. 학교에서 왜 안 짜르는지 모르겠음", category: "감정", filtered: null, reason: "인신공격 및 비건설적 불만" },
  ];

  return Array.from({ length: count }, () => {
    const pick = commentPool[Math.floor(Math.random() * commentPool.length)];
    return {
      speed: weightedPick(speeds, speedWeights[bias]),
      comprehension: weightedPick(comprehensions, compWeights[bias]),
      communication: commRanges[bias](),
      interest: commRanges[bias](),
      comment: pick.text,
      filteredComment: pick.filtered,
      commentCategory: pick.category,
      commentFilterReason: pick.reason,
    };
  });
}

async function seedFeedbacks(courseId: string, count: number, bias: Bias) {
  const fbs = randomFeedbacks(count, bias);
  await prisma.feedback.createMany({
    data: fbs.map((fb) => ({ courseId, ...fb })),
  });
  return count;
}

async function main() {
  // Clean
  await prisma.submissionLog.deleteMany();
  await prisma.studentCourseToken.deleteMany();
  await prisma.courseStudent.deleteMany();
  await prisma.improvementNote.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.feedbackToken.deleteMany();
  await prisma.lectureMaterial.deleteMany();
  await prisma.feedbackRound.deleteMany();
  await prisma.student.deleteMany();
  await prisma.course.deleteMany();
  await prisma.professor.deleteMany();

  const pw = await bcrypt.hash("demo1234", 12);

  // ═══════════════════════════════════════
  // 교수 12명
  // ═══════════════════════════════════════

  const professors = await Promise.all([
    prisma.professor.create({ data: { name: "김민수", email: "kim@hansung.ac.kr", password: pw } }),
    prisma.professor.create({ data: { name: "이영희", email: "lee@hansung.ac.kr", password: pw } }),
    prisma.professor.create({ data: { name: "박준혁", email: "park@hansung.ac.kr", password: pw } }),
    prisma.professor.create({ data: { name: "정수진", email: "jung@hansung.ac.kr", password: pw } }),
    prisma.professor.create({ data: { name: "최동원", email: "choi@hansung.ac.kr", password: pw } }),
    prisma.professor.create({ data: { name: "한서연", email: "han@hansung.ac.kr", password: pw } }),
    prisma.professor.create({ data: { name: "윤재호", email: "yoon@hansung.ac.kr", password: pw } }),
    prisma.professor.create({ data: { name: "송미라", email: "song@hansung.ac.kr", password: pw } }),
    prisma.professor.create({ data: { name: "강태영", email: "kang@hansung.ac.kr", password: pw } }),
    prisma.professor.create({ data: { name: "오현석", email: "oh@hansung.ac.kr", password: pw } }),
    prisma.professor.create({ data: { name: "임지은", email: "lim@hansung.ac.kr", password: pw } }),
    prisma.professor.create({ data: { name: "조성민", email: "jo@hansung.ac.kr", password: pw } }),
  ]);

  const [김, 이, 박, 정, 최, 한, 윤, 송, 강, 오, 임, 조] = professors;

  // ═══════════════════════════════════════
  // 강의 데이터 정의
  // [교수, 강의명, 학기, 카테고리, 피드백수, 경향, 수강생수]
  // ═══════════════════════════════════════

  const courseData: [typeof 김, string, string, string, number, Bias, number][] = [
    // ── 컴퓨터과학 ──────────────────────────

    // 김민수 (메인 데모 계정) — 중간 수준, 꾸준
    [김, "인공지능 개론", "2026-1", "컴퓨터과학", 22, "mid", 35],
    [김, "데이터베이스", "2026-1", "컴퓨터과학", 18, "mid", 30],
    [김, "기계학습", "2025-2", "컴퓨터과학", 20, "mid", 32],
    [김, "데이터마이닝", "2025-1", "컴퓨터과학", 16, "neutral", 28],

    // 이영희 — 개선 사례: low → mid → high
    [이, "알고리즘", "2026-1", "컴퓨터과학", 25, "high", 40],
    [이, "자료구조", "2025-2", "컴퓨터과학", 22, "mid", 45],
    [이, "프로그래밍 기초", "2025-1", "컴퓨터과학", 20, "low", 50],

    // 박준혁 — 개선 사례: low → high
    [박, "운영체제", "2026-1", "컴퓨터과학", 20, "high", 30],
    [박, "컴퓨터구조", "2025-2", "컴퓨터과학", 18, "low", 35],
    [박, "시스템프로그래밍", "2025-1", "컴퓨터과학", 15, "low", 25],

    // 정수진 — 꾸준히 높음
    [정, "컴퓨터네트워크", "2026-1", "컴퓨터과학", 24, "high", 38],
    [정, "정보보안", "2025-2", "컴퓨터과학", 20, "high", 30],
    [정, "웹프로그래밍", "2025-1", "컴퓨터과학", 18, "high", 35],

    // 최동원 — 약간 하락
    [최, "소프트웨어공학", "2026-1", "컴퓨터과학", 16, "mid", 28],
    [최, "클라우드컴퓨팅", "2025-2", "컴퓨터과학", 15, "high", 25],

    // 한서연 — 올해 신규
    [한, "모바일프로그래밍", "2026-1", "컴퓨터과학", 20, "high", 32],

    // ── 수학·통계 ──────────────────────────

    // 윤재호 — 개선 사례: low → mid
    [윤, "확률과 통계", "2026-1", "수학·통계", 18, "mid", 40],
    [윤, "선형대수학", "2025-2", "수학·통계", 22, "low", 50],
    [윤, "미적분학", "2025-1", "수학·통계", 25, "low", 60],

    // 송미라 — 꾸준히 높음
    [송, "이산수학", "2026-1", "수학·통계", 20, "high", 35],
    [송, "수리통계학", "2025-2", "수학·통계", 16, "high", 28],

    // ── 경영·경제 ──────────────────────────

    // 강태영 — 개선 사례
    [강, "경영학원론", "2026-1", "경영·경제", 22, "high", 45],
    [강, "마케팅원론", "2025-2", "경영·경제", 20, "low", 50],

    // 오현석 — 중간
    [오, "회계원리", "2026-1", "경영·경제", 18, "mid", 35],
    [오, "재무관리", "2025-2", "경영·경제", 15, "mid", 30],

    // ── 교양 ──────────────────────────

    // 임지은 — 꾸준히 높음
    [임, "창의적 사고", "2026-1", "교양", 25, "high", 40],
    [임, "글쓰기의 기초", "2025-2", "교양", 22, "high", 35],

    // 조성민 — 개선 사례
    [조, "AI와 사회", "2026-1", "교양", 20, "high", 30],
    [조, "테크놀로지와 윤리", "2025-2", "교양", 18, "low", 40],
    [조, "디지털 리터러시", "2025-1", "교양", 15, "low", 35],
  ];

  // ═══════════════════════════════════════
  // 김민수 상세 피드백 (인공지능 개론 — 자연스러운 데이터)
  // ═══════════════════════════════════════

  // 인공지능 개론 — 주차별 5개씩 (1~8주차, 총 40개)
  const kimDetailedFeedbacks = [
    // ── 1주차 (도입, 긍정적) ──
    { speed: "moderate", comprehension: "high", communication: 4, comment: "AI의 역사부터 현재 트렌드까지 체계적으로 설명해주셔서 왜 이 과목을 배워야 하는지 맥락이 잡혔습니다. 첫 수업치고 구성이 좋았어요.", filteredComment: "AI의 역사부터 현재 트렌드까지 체계적으로 설명해주셔서 왜 이 과목을 배워야 하는지 맥락이 잡혔습니다. 첫 수업치고 구성이 좋았어요.", commentCategory: "학습", commentFilterReason: "구체적인 긍정 피드백", freeText: null },
    { speed: "fast", comprehension: "medium", communication: 3, comment: "개념을 너무 빠르게 훑고 넘어가서 따라가기 벅찼습니다. 도입부 개념에 배경지식이 없는 학생도 있으니 조금 더 천천히 진행해주시면 좋겠어요.", filteredComment: "개념을 너무 빠르게 훑고 넘어가서 따라가기 벅찼습니다. 도입부 개념에 배경지식이 없는 학생도 있으니 조금 더 천천히 진행해주시면 좋겠어요.", commentCategory: "학습", commentFilterReason: "수업 속도에 대한 건설적 피드백", freeText: null },
    { speed: "moderate", comprehension: "medium", communication: 3, comment: null, filteredComment: null, commentCategory: null, commentFilterReason: null, freeText: null },
    { speed: "slow", comprehension: "high", communication: 5, comment: "각 개념마다 왜 등장했는지 역사적 맥락을 먼저 설명해주셔서 이해가 자연스럽게 됐습니다. 이런 방식 정말 좋아요.", filteredComment: "각 개념마다 왜 등장했는지 역사적 맥락을 먼저 설명해주셔서 이해가 자연스럽게 됐습니다. 이런 방식 정말 좋아요.", commentCategory: "학습", commentFilterReason: "강의 방식에 대한 구체적 긍정 피드백", freeText: null },
    { speed: "moderate", comprehension: "medium", communication: 4, comment: "솔직히 첫 수업이라 AI가 뭔지 막막했는데, 전체 맵을 그려주시니까 앞으로 배울 내용이 어디에 해당하는지 보여서 좋았어요. 다음 주가 기대됩니다.", filteredComment: "솔직히 첫 수업이라 AI가 뭔지 막막했는데, 전체 맵을 그려주시니까 앞으로 배울 내용이 어디에 해당하는지 보여서 좋았어요. 다음 주가 기대됩니다.", commentCategory: "학습", commentFilterReason: "구체적인 긍정 피드백 (구어체 포함)", freeText: null },
    // ── 2주차 (머신러닝 기초, 약간 어려움) ──
    { speed: "fast", comprehension: "low", communication: 2, comment: "선형회귀 수식 유도 부분에서 PPT를 너무 빠르게 넘겨서 필기를 놓쳤습니다. 수식은 칠판에 직접 쓰거나 페이지당 2분 정도 멈춰주시면 좋겠어요.", filteredComment: "선형회귀 수식 유도 부분에서 PPT를 너무 빠르게 넘겨서 필기를 놓쳤습니다. 수식은 칠판에 직접 쓰거나 페이지당 2분 정도 멈춰주시면 좋겠어요.", commentCategory: "학습", commentFilterReason: "수업 진행 방식에 대한 구체적 건설적 피드백", freeText: null },
    { speed: "moderate", comprehension: "medium", communication: 3, comment: "이론 설명은 이해됐는데 이게 실제로 어디에 쓰이는지 예시가 없어서 공중에 뜬 느낌입니다. 넷플릭스 추천이나 스팸 필터 같은 사례를 들어주시면 이해가 훨씬 빠를 것 같아요.", filteredComment: "이론 설명은 이해됐는데 이게 실제로 어디에 쓰이는지 예시가 없어서 공중에 뜬 느낌입니다. 넷플릭스 추천이나 스팸 필터 같은 사례를 들어주시면 이해가 훨씬 빠를 것 같아요.", commentCategory: "학습", commentFilterReason: "자료 개선에 대한 구체적 건설적 요청", freeText: null },
    { speed: "moderate", comprehension: "high", communication: 4, comment: "비용 함수를 그래프로 시각화해서 보여주신 게 정말 좋았습니다. 수식만 보면 감이 안 잡히는데 그래프로 보니까 경사하강법이 왜 작동하는지 바로 이해됐어요.", filteredComment: "비용 함수를 그래프로 시각화해서 보여주신 게 정말 좋았습니다. 수식만 보면 감이 안 잡히는데 그래프로 보니까 경사하강법이 왜 작동하는지 바로 이해됐어요.", commentCategory: "학습", commentFilterReason: "강의 방식에 대한 구체적 긍정 피드백", freeText: null },
    { speed: "fast", comprehension: "medium", communication: 3, comment: "수식이 많아서 어렵긴 한데, 단계별로 유도해주셔서 그나마 따라갔어요. 근데 gradient 계산 부분은 좀 더 천천히 해주시면 좋겠습니다.", filteredComment: "수식이 많아서 어렵긴 한데, 단계별로 유도해주셔서 그나마 따라갔어요. 근데 gradient 계산 부분은 좀 더 천천히 해주시면 좋겠습니다.", commentCategory: "학습", commentFilterReason: "구체적인 혼합 피드백 (구어체 포함)", freeText: null },
    { speed: "moderate", comprehension: "low", communication: 2, comment: "overfitting, regularization 같은 전문 용어를 처음 등장할 때 정의 없이 쓰셔서 따라가기 힘들었습니다. 처음 나오는 용어는 한 줄 정의라도 넣어주시면 좋겠어요.", filteredComment: "overfitting, regularization 같은 전문 용어를 처음 등장할 때 정의 없이 쓰셔서 따라가기 힘들었습니다. 처음 나오는 용어는 한 줄 정의라도 넣어주시면 좋겠어요.", commentCategory: "학습", commentFilterReason: "자료 난이도에 대한 구체적 건설적 피드백", freeText: null },
    // ── 3주차 (신경망, 중간 수준) ──
    { speed: "moderate", comprehension: "high", communication: 5, comment: "역전파 알고리즘을 애니메이션으로 보여주신 게 완전 신의 한 수였어요. 다른 수업에서 두 번이나 들었는데도 이해 못했던 부분인데 이번에 드디어 이해됐습니다.", filteredComment: "역전파 알고리즘을 애니메이션으로 보여주신 게 완전 신의 한 수였어요. 다른 수업에서 두 번이나 들었는데도 이해 못했던 부분인데 이번에 드디어 이해됐습니다.", commentCategory: "학습", commentFilterReason: "구체적인 긍정 피드백 (구어체 포함)", freeText: null },
    { speed: "moderate", comprehension: "medium", communication: 4, comment: "이론은 어느 정도 이해됐는데, 실습 시간이 너무 짧아서 직접 구현해볼 시간이 없었습니다. 코드를 같이 작성하는 시간이 30분만 있어도 이해도가 훨씬 올라갈 것 같아요.", filteredComment: "이론은 어느 정도 이해됐는데, 실습 시간이 너무 짧아서 직접 구현해볼 시간이 없었습니다. 코드를 같이 작성하는 시간이 30분만 있어도 이해도가 훨씬 올라갈 것 같아요.", commentCategory: "학습", commentFilterReason: "실습 시간에 대한 구체적 건설적 요청", freeText: null },
    { speed: "fast", comprehension: "low", communication: 2, comment: "코드를 슬라이드에 올려놓고 설명하시는데, 실행 결과 없이 코드만 보여주시니까 '이게 실제로 어떻게 작동하는 건지' 감이 안 잡혔습니다. Jupyter 노트북으로 실시간 실행하면서 보여주시면 좋겠어요.", filteredComment: "코드를 슬라이드에 올려놓고 설명하시는데, 실행 결과 없이 코드만 보여주시니까 감이 안 잡혔습니다. Jupyter 노트북으로 실시간 실행하면서 보여주시면 좋겠어요.", commentCategory: "학습", commentFilterReason: "강의 방식에 대한 구체적 건설적 제안", freeText: null },
    { speed: "moderate", comprehension: "high", communication: 4, comment: null, filteredComment: null, commentCategory: null, commentFilterReason: null, freeText: null },
    { speed: "fast", comprehension: "medium", communication: 3, comment: "솔직히 엄청 어렵긴 한데 그래도 배우는 게 확실히 많은 수업이에요. 어렵다고 포기하기보단 따라가려고 노력하게 되는 수업입니다.", filteredComment: "솔직히 엄청 어렵긴 한데 그래도 배우는 게 확실히 많은 수업이에요. 어렵다고 포기하기보단 따라가려고 노력하게 되는 수업입니다.", commentCategory: "학습", commentFilterReason: "솔직한 혼합 평가 (구어체 포함)", freeText: null },
    // ── 4주차 (실습 강화, 긍정 상승) ──
    { speed: "moderate", comprehension: "high", communication: 4, comment: "이번 주 실습 과제 난이도가 딱 적당했습니다. 이론을 복습하면서 동시에 구현까지 해볼 수 있어서 개념이 확실히 정리됐어요.", filteredComment: "이번 주 실습 과제 난이도가 딱 적당했습니다. 이론을 복습하면서 동시에 구현까지 해볼 수 있어서 개념이 확실히 정리됐어요.", commentCategory: "학습", commentFilterReason: "과제에 대한 구체적 긍정 피드백", freeText: null },
    { speed: "slow", comprehension: "high", communication: 5, comment: "학생 반응을 보면서 속도를 조절해주신 게 느껴졌어요. 이번 주는 처음으로 수업 내용을 완전히 따라갔다는 느낌이 들었습니다.", filteredComment: "학생 반응을 보면서 속도를 조절해주신 게 느껴졌어요. 이번 주는 처음으로 수업 내용을 완전히 따라갔다는 느낌이 들었습니다.", commentCategory: "학습", commentFilterReason: "강의 방식에 대한 구체적 긍정 피드백", freeText: null },
    { speed: "moderate", comprehension: "medium", communication: 3, comment: "수업 중 질문 시간이 마지막에만 있는데, 중간에 1~2분씩 짧게 있으면 흐름을 놓치지 않을 것 같습니다. 마지막에 몰아서 하면 질문 내용을 까먹기도 하고요.", filteredComment: "수업 중 질문 시간이 마지막에만 있는데, 중간에 1~2분씩 짧게 있으면 흐름을 놓치지 않을 것 같습니다. 마지막에 몰아서 하면 질문 내용을 까먹기도 하고요.", commentCategory: "학습", commentFilterReason: "소통 방식에 대한 구체적 건설적 요청", freeText: null },
    { speed: "moderate", comprehension: "high", communication: 5, comment: "실습 시간이 늘어나고 나서 수업이 훨씬 재미있어졌습니다. 직접 구현해보면서 이해도가 확 올라갔고, 이론과 코드가 연결되는 게 느껴져요.", filteredComment: "실습 시간이 늘어나고 나서 수업이 훨씬 재미있어졌습니다. 직접 구현해보면서 이해도가 확 올라갔고, 이론과 코드가 연결되는 게 느껴져요.", commentCategory: "학습", commentFilterReason: "수업 구성 변화에 대한 구체적 긍정 피드백", freeText: null },
    { speed: "moderate", comprehension: "medium", communication: 4, comment: "지금까지 중에 가장 좋은 수업이었습니다. 실습 늘어난 거 계속 유지해주세요!", filteredComment: "지금까지 중에 가장 좋은 수업이었습니다. 실습 늘어난 거 계속 유지해주세요!", commentCategory: "학습", commentFilterReason: "전반적 긍정 피드백", freeText: null },
    // ── 5주차 (심화, 불만 증가) ──
    { speed: "fast", comprehension: "medium", communication: 3, comment: "심화 내용으로 넘어가면서 속도가 다시 빨라졌습니다. 3~4주차 속도가 좋았는데 그 페이스로 유지해주시면 좋겠어요. 중간에 5분 정도 이전 내용 정리 시간도 있으면 좋을 것 같고요.", filteredComment: "심화 내용으로 넘어가면서 속도가 다시 빨라졌습니다. 3~4주차 속도가 좋았는데 그 페이스로 유지해주시면 좋겠어요. 중간에 5분 정도 이전 내용 정리 시간도 있으면 좋을 것 같고요.", commentCategory: "학습", commentFilterReason: "수업 속도에 대한 구체적 건설적 요청", freeText: null },
    { speed: "moderate", comprehension: "medium", communication: 3, comment: "조별 과제가 다른 과목 마감이랑 겹쳐서 굉장히 부담됐습니다. 과제 마감 일정을 미리 학기 초에 공지해주시거나, 다른 과목 마감 주간은 피해주시면 좋겠어요.", filteredComment: "조별 과제가 다른 과목 마감이랑 겹쳐서 굉장히 부담됐습니다. 과제 마감 일정을 미리 학기 초에 공지해주시거나, 다른 과목 마감 주간은 피해주시면 좋겠어요.", commentCategory: "학습", commentFilterReason: "과제 일정에 대한 구체적 건설적 피드백", freeText: null },
    { speed: "fast", comprehension: "low", communication: 1, comment: "교수님 설명 진짜 개못함. 혼자 중얼거리면서 수업하지 마세요.", filteredComment: "설명이 불명확하고 전달력이 부족합니다. 학생들과 눈 맞춤을 더 해주시면 좋겠습니다.", commentCategory: "혼합", commentFilterReason: "설명 방식에 대한 불만이 있으나 비속어 포함", commentHasProfanity: true, freeText: null },
    { speed: "fast", comprehension: "low", communication: 1, comment: "이 수업 듣느니 차라리 자는 게 나음 ㅋㅋ 시간 아까움", filteredComment: null, commentCategory: "감정", commentFilterReason: "비건설적 불만 및 조롱", freeText: null },
    { speed: "fast", comprehension: "low", communication: 1, comment: "질문했을 때 무시당하는 느낌을 받아서 수업에 집중하기 힘들었습니다. 질문이 틀렸어도 '이런 관점도 있구나' 하는 식으로 받아주시면 더 편하게 질문할 수 있을 것 같아요.", filteredComment: "질문했을 때 무시당하는 느낌을 받아서 수업에 집중하기 힘들었습니다. 질문이 틀렸어도 '이런 관점도 있구나' 하는 식으로 받아주시면 더 편하게 질문할 수 있을 것 같아요.", commentCategory: "학습", commentFilterReason: "소통 방식에 대한 솔직한 건설적 피드백", freeText: null },
    { speed: "slow", comprehension: "high", communication: 5, comment: "마지막에 이번 주 내용을 한 장으로 요약해주시는 게 정말 도움됩니다. 어려운 내용을 들은 뒤 복습 슬라이드로 정리되는 느낌이에요.", filteredComment: "마지막에 이번 주 내용을 한 장으로 요약해주시는 게 정말 도움됩니다. 어려운 내용을 들은 뒤 복습 슬라이드로 정리되는 느낌이에요.", commentCategory: "학습", commentFilterReason: "수업 구성에 대한 구체적 긍정 피드백", freeText: null },
    // ── 6주차 (CNN/합성곱 신경망) ──
    { speed: "moderate", comprehension: "high", communication: 5, comment: "Conv2D 필터가 이미지 위를 슬라이딩하며 특징을 추출하는 과정을 격자 애니메이션으로 보여주신 덕분에 '합성곱'이 왜 그 이름인지 직관적으로 이해됐습니다.", filteredComment: "Conv2D 필터가 이미지 위를 슬라이딩하며 특징을 추출하는 과정을 격자 애니메이션으로 보여주신 덕분에 '합성곱'이 왜 그 이름인지 직관적으로 이해됐습니다.", commentCategory: "학습", commentFilterReason: "강의 방식에 대한 구체적 긍정 피드백", freeText: null },
    { speed: "fast", comprehension: "medium", communication: 3, comment: "Max pooling vs average pooling 차이 설명이 빠르게 넘어갔는데, 결과 이미지를 나란히 비교해서 보여주시면 어떤 상황에 뭘 쓸지 판단 기준이 잡힐 것 같아요.", filteredComment: "Max pooling vs average pooling 차이 설명이 빠르게 넘어갔는데, 결과 이미지를 나란히 비교해서 보여주시면 어떤 상황에 뭘 쓸지 판단 기준이 잡힐 것 같아요.", commentCategory: "학습", commentFilterReason: "수업 속도에 대한 구체적 건설적 피드백", freeText: null },
    { speed: "moderate", comprehension: "medium", communication: 4, comment: null, filteredComment: null, commentCategory: null, commentFilterReason: null, freeText: null },
    { speed: "slow", comprehension: "high", communication: 4, comment: "고양이/개 이미지 분류 모델을 훈련 과정부터 실시간으로 돌려주신 게 인상적이었습니다. 정확도가 epoch마다 올라가는 걸 직접 보니 이론이 실제로 작동한다는 게 실감났어요.", filteredComment: "고양이/개 이미지 분류 모델을 훈련 과정부터 실시간으로 돌려주신 게 인상적이었습니다. 정확도가 epoch마다 올라가는 걸 직접 보니 이론이 실제로 작동한다는 게 실감났어요.", commentCategory: "학습", commentFilterReason: "실습 시연에 대한 구체적 긍정 피드백", freeText: null },
    { speed: "fast", comprehension: "medium", communication: 3, comment: "Keras로 CNN 짜는 실습 시간이 너무 짧았어요. 레이어 쌓는 것까지만 하고 끝나서 학습까지 돌려보고 싶었는데 아쉬웠습니다. 실습 노트북 파일로 나눠주시면 집에서라도 해볼 수 있겠어요.", filteredComment: "Keras로 CNN 짜는 실습 시간이 너무 짧았어요. 레이어 쌓는 것까지만 하고 끝나서 학습까지 돌려보고 싶었는데 아쉬웠습니다. 실습 노트북 파일로 나눠주시면 집에서라도 해볼 수 있겠어요.", commentCategory: "학습", commentFilterReason: "실습 시간에 대한 구체적 건설적 요청", freeText: null },
    // ── 7주차 (RNN/LSTM/시계열) ──
    { speed: "moderate", comprehension: "high", communication: 4, comment: "기울기 소실 문제를 그래프로 시각화한 뒤 LSTM의 게이트 구조가 이를 어떻게 해결하는지 자연스럽게 연결해주셔서 '왜 LSTM인가'가 완전히 납득됐습니다.", filteredComment: "기울기 소실 문제를 그래프로 시각화한 뒤 LSTM의 게이트 구조가 이를 어떻게 해결하는지 자연스럽게 연결해주셔서 '왜 LSTM인가'가 완전히 납득됐습니다.", commentCategory: "학습", commentFilterReason: "강의 구성에 대한 구체적 긍정 피드백", freeText: null },
    { speed: "moderate", comprehension: "medium", communication: 3, comment: "GRU와 LSTM 비교에서 파라미터 수 차이만 언급됐는데, 실제 태스크별 성능 벤치마크가 있으면 언제 뭘 선택해야 할지 판단에 도움이 될 것 같아요.", filteredComment: "GRU와 LSTM 비교에서 파라미터 수 차이만 언급됐는데, 실제 태스크별 성능 벤치마크가 있으면 언제 뭘 선택해야 할지 판단에 도움이 될 것 같아요.", commentCategory: "학습", commentFilterReason: "자료 구성에 대한 구체적 건설적 요청", freeText: null },
    { speed: "moderate", comprehension: "medium", communication: 3, comment: null, filteredComment: null, commentCategory: null, commentFilterReason: null, freeText: null },
    { speed: "slow", comprehension: "high", communication: 5, comment: "RNN을 unfolded 형태로 펼쳐서 타임스텝별로 설명해주시니 입력이 어떻게 흐르는지 한눈에 들어왔습니다. 그 전까진 순환 다이어그램이 계속 헷갈렸는데 이번에 완전히 정리됐어요.", filteredComment: "RNN을 unfolded 형태로 펼쳐서 타임스텝별로 설명해주시니 입력이 어떻게 흐르는지 한눈에 들어왔습니다. 그 전까진 순환 다이어그램이 계속 헷갈렸는데 이번에 완전히 정리됐어요.", commentCategory: "학습", commentFilterReason: "구체적인 긍정 피드백 (구어체 포함)", freeText: null },
    { speed: "fast", comprehension: "low", communication: 2, comment: "시계열 예측 실습이 MNIST 분류로 대체됐는데, LSTM 본래 강점인 시계열 데이터(주가, 날씨 등)로 실습했으면 개념이 더 잘 연결됐을 것 같습니다.", filteredComment: "시계열 예측 실습이 MNIST 분류로 대체됐는데, LSTM 본래 강점인 시계열 데이터(주가, 날씨 등)로 실습했으면 개념이 더 잘 연결됐을 것 같습니다.", commentCategory: "학습", commentFilterReason: "실습 주제에 대한 구체적 건설적 피드백", freeText: null },
    // ── 8주차 (Transformer/LLM, 진행 중 — 응답 3개) ──
    { speed: "fast", comprehension: "medium", communication: 3, comment: "Transformer의 Self-attention이 처음이라 복잡한데, 기존 RNN과 어떻게 다른지 구조 비교 시각화가 있으면 이해가 빠를 것 같아요.", filteredComment: "Transformer의 Self-attention이 처음이라 복잡한데, 기존 RNN과 어떻게 다른지 구조 비교 시각화가 있으면 이해가 빠를 것 같아요.", commentCategory: "학습", commentFilterReason: "자료 개선에 대한 구체적 건설적 요청", freeText: null },
    { speed: "moderate", comprehension: "high", communication: 4, comment: "GPT 동작 원리를 실제 ChatGPT 응답 예시로 보여주시니 '다음 토큰 예측'이 이렇게 단순한 원리였구나 하고 놀랐습니다. AI 과목 마무리 주제로 딱 어울려요.", filteredComment: "GPT 동작 원리를 실제 ChatGPT 응답 예시로 보여주시니 '다음 토큰 예측'이 이렇게 단순한 원리였구나 하고 놀랐습니다. AI 과목 마무리 주제로 딱 어울려요.", commentCategory: "학습", commentFilterReason: "강의 주제와 방식에 대한 구체적 긍정 피드백", freeText: null },
    { speed: "moderate", comprehension: "medium", communication: 3, comment: null, filteredComment: null, commentCategory: null, commentFilterReason: null, freeText: null },
    { speed: "moderate", comprehension: "medium", communication: 4, comment: null, filteredComment: null, commentCategory: null, commentFilterReason: null, freeText: null },
    { speed: "slow", comprehension: "high", communication: 4, comment: null, filteredComment: null, commentCategory: null, commentFilterReason: null, freeText: null },
  ];

  // 데이터베이스 — 주차별 6개씩 (1~6주차, 총 36개)
  const kimDetailedFeedbacks2 = [
    // ── 1주차 (관계형 DB 기초, ERD, 기초 SQL) ──
    { speed: "slow", comprehension: "high", communication: 5, comment: "Entity와 Relationship을 실제 도서관 DB 예시로 ERD를 직접 그려가면서 설명해주신 덕분에 추상적인 개념이 구체적으로 잡혔습니다. 첫 수업인데 ERD가 왜 필요한지 바로 이해됐어요.", filteredComment: "Entity와 Relationship을 실제 도서관 DB 예시로 ERD를 직접 그려가면서 설명해주신 덕분에 추상적인 개념이 구체적으로 잡혔습니다. 첫 수업인데 ERD가 왜 필요한지 바로 이해됐어요.", commentCategory: "학습", commentFilterReason: "강의 방식에 대한 구체적 긍정 피드백", freeText: null },
    { speed: "fast", comprehension: "medium", communication: 3, comment: "SQL 실습할 때 교수님 화면 폰트가 너무 작아서 뒤에서 따라가기 힘들었습니다. SELECT/FROM/WHERE 타이핑하면서 강의하실 때 터미널 폰트 크기를 16pt 이상으로 키워주시면 좋겠어요.", filteredComment: "SQL 실습할 때 교수님 화면 폰트가 너무 작아서 뒤에서 따라가기 힘들었습니다. SELECT/FROM/WHERE 타이핑하면서 강의하실 때 터미널 폰트 크기를 16pt 이상으로 키워주시면 좋겠어요.", commentCategory: "학습", commentFilterReason: "실습 환경에 대한 구체적 건설적 요청", freeText: null },
    { speed: "moderate", comprehension: "medium", communication: 3, comment: null, filteredComment: null, commentCategory: null, commentFilterReason: null, freeText: null },
    { speed: "moderate", comprehension: "high", communication: 4, comment: "테이블을 Excel 시트에 비빈해서 설명해주시고 나서 스키마 개념이 단번에 이해됐습니다. 기본 키·외래 키 관계도 실제 학번-성적 테이블 예시로 설명해주신 게 직관적이었어요.", filteredComment: "테이블을 Excel 시트에 비교해서 설명해주시고 나서 스키마 개념이 단번에 이해됐습니다. 기본 키·외래 키 관계도 실제 학번-성적 테이블 예시로 설명해주신 게 직관적이었어요.", commentCategory: "학습", commentFilterReason: "비유 활용 강의 방식에 대한 구체적 긍정 피드백", freeText: null },
    { speed: "fast", comprehension: "low", communication: 2, comment: "1정규화 설명하면서 슬라이드를 너무 빠르게 넘기셔서 비정규 테이블과 정규화된 테이블 비교 화면을 제대로 못 봤습니다. 예제 테이블은 최소 1분은 유지해주시면 좋겠어요.", filteredComment: "1정규화 설명하면서 슬라이드를 너무 빠르게 넘기셔서 비정규 테이블과 정규화된 테이블 비교 화면을 제대로 못 봤습니다. 예제 테이블은 최소 1분은 유지해주시면 좋겠어요.", commentCategory: "학습", commentFilterReason: "수업 속도에 대한 구체적 건설적 피드백", freeText: null },
    { speed: "moderate", comprehension: "medium", communication: 3, comment: "수업 자료가 수업 당일에 올라와서 미리 예습을 못 했습니다. 전날 저녁이라도 올려주시면 기본 개념 보고 올 수 있을 것 같아요.", filteredComment: "수업 자료가 수업 당일에 올라와서 미리 예습을 못 했습니다. 전날 저녁이라도 올려주시면 기본 개념 보고 올 수 있을 것 같아요.", commentCategory: "학습", commentFilterReason: "수업 자료 공유 방식에 대한 건설적 요청", freeText: null },
    // ── 2주차 (JOIN, 서브쿼리, ACID 트랜잭션) ──
    { speed: "moderate", comprehension: "high", communication: 4, comment: "INNER JOIN과 LEFT JOIN 결과를 같은 데이터로 쿼리를 두 번 실행해서 결과를 나란히 보여주신 게 정말 효과적이었습니다. 차이가 한눈에 들어왔어요.", filteredComment: "INNER JOIN과 LEFT JOIN 결과를 같은 데이터로 쿼리를 두 번 실행해서 결과를 나란히 보여주신 게 정말 효과적이었습니다. 차이가 한눈에 들어왔어요.", commentCategory: "학습", commentFilterReason: "강의 방식에 대한 구체적 긍정 피드백", freeText: null },
    { speed: "moderate", comprehension: "medium", communication: 3, comment: "서브쿼리를 배우고 나서 JOIN이랑 언제 어떤 걸 써야 하는지 기준이 없어서 헷갈립니다. '이런 경우엔 서브쿼리, 이런 경우엔 JOIN' 같은 가이드라인을 한 장으로 정리해주시면 좋겠어요.", filteredComment: "서브쿼리를 배우고 나서 JOIN이랑 언제 어떤 걸 써야 하는지 기준이 없어서 헷갈립니다. '이런 경우엔 서브쿼리, 이런 경우엔 JOIN' 같은 가이드라인을 한 장으로 정리해주시면 좋겠어요.", commentCategory: "학습", commentFilterReason: "자료 구성에 대한 구체적 건설적 요청", freeText: null },
    { speed: "moderate", comprehension: "medium", communication: 4, comment: "ACID 중 Atomicity, Consistency, Durability는 이해됐는데 Isolation level 4단계(READ UNCOMMITTED~SERIALIZABLE)는 각각 어떤 상황에서 쓰는지 감이 안 옵니다. 예시 시나리오가 있으면 좋겠어요.", filteredComment: "ACID 중 Atomicity, Consistency, Durability는 이해됐는데 Isolation level 4단계(READ UNCOMMITTED~SERIALIZABLE)는 각각 어떤 상황에서 쓰는지 감이 안 옵니다. 예시 시나리오가 있으면 좋겠어요.", commentCategory: "학습", commentFilterReason: "특정 개념에 대한 구체적 건설적 요청", freeText: null },
    { speed: "fast", comprehension: "medium", communication: 3, comment: null, filteredComment: null, commentCategory: null, commentFilterReason: null, freeText: null },
    { speed: "moderate", comprehension: "high", communication: 5, comment: "MySQL Workbench에서 직접 쿼리 짜고 실행하는 실습이 정말 좋았습니다. 슬라이드로만 보던 것보다 실행 결과를 보니까 GROUP BY, HAVING 개념이 확실히 박혔어요.", filteredComment: "MySQL Workbench에서 직접 쿼리 짜고 실행하는 실습이 정말 좋았습니다. 슬라이드로만 보던 것보다 실행 결과를 보니까 GROUP BY, HAVING 개념이 확실히 박혔어요.", commentCategory: "학습", commentFilterReason: "실습 방식에 대한 구체적 긍정 피드백", freeText: null },
    { speed: "fast", comprehension: "low", communication: 2, comment: "인덱스 설명이 진짜 개지루하게 넘어갔는데, 인덱스 없는 쿼리 vs 있는 쿼리 실행시간 비교 한 번만 보여주셔도 왜 필요한지 바로 이해할 것 같아요.", filteredComment: "인덱스 설명 파트가 다소 단조롭게 느껴졌습니다. 인덱스 없는 쿼리와 있는 쿼리의 실행 시간 비교 시연이 있으면 필요성이 훨씬 와닿을 것 같아요.", commentCategory: "혼합", commentFilterReason: "수업 방식에 대한 불만이 있으나 비속어 포함", commentHasProfanity: true, freeText: null },
    // ── 3주차 (정규화 심화, NoSQL, 최종 프로젝트) ──
    { speed: "moderate", comprehension: "high", communication: 5, comment: "정규화를 1NF→2NF→3NF 단계별로 같은 수강신청 테이블을 직접 변환해가면서 보여주신 방식이 완벽한 설명이었습니다. '이 컬럼이 왜 분리되어야 하는가'가 각 단계마다 명확하게 이해됐어요.", filteredComment: "정규화를 1NF→2NF→3NF 단계별로 같은 수강신청 테이블을 직접 변환해가면서 보여주신 방식이 완벽한 설명이었습니다. '이 컬럼이 왜 분리되어야 하는가'가 각 단계마다 명확하게 이해됐어요.", commentCategory: "학습", commentFilterReason: "강의 방식에 대한 구체적 긍정 피드백", freeText: null },
    { speed: "moderate", comprehension: "medium", communication: 3, comment: "NoSQL이랑 관계형 DB를 특징 나열 방식으로 비교해주셨는데, '이런 서비스엔 MongoDB, 이런 경우엔 PostgreSQL'처럼 실제 적용 시나리오를 들어주시면 훨씬 실용적일 것 같습니다.", filteredComment: "NoSQL이랑 관계형 DB를 특징 나열 방식으로 비교해주셨는데, '이런 서비스엔 MongoDB, 이런 경우엔 PostgreSQL'처럼 실제 적용 시나리오를 들어주시면 훨씬 실용적일 것 같습니다.", commentCategory: "학습", commentFilterReason: "자료 구성에 대한 구체적 건설적 요청", freeText: null },
    { speed: "moderate", comprehension: "medium", communication: 4, comment: null, filteredComment: null, commentCategory: null, commentFilterReason: null, freeText: null },
    { speed: "fast", comprehension: "low", communication: 1, comment: "이 수업 솔직히 별로임. 뭘 공부해야 하는지도 모르겠고 강의 방향도 없어보임 ㅋ", filteredComment: null, commentCategory: "감정", commentFilterReason: "비건설적 불만 및 비속어", freeText: null },
    { speed: "fast", comprehension: "low", communication: 1, comment: "수업 내용이 ㅈ같음. 교수가 자기만 알아듣는 용어 막 쓰면서 혼자 달려가는데 따라가는 사람이 몇이나 되는지 모르겠음", filteredComment: "설명이 학생 눈높이에 맞지 않아 따라가기 어렵습니다. 주요 용어는 처음 등장할 때 정의해주시면 좋겠어요.", commentCategory: "혼합", commentFilterReason: "설명 방식에 대한 불만이 있으나 비속어 포함", commentHasProfanity: true, freeText: null },
    { speed: "moderate", comprehension: "high", communication: 4, comment: "솔직히 SQL이 이렇게 깊은 줄 몰랐는데 3주 지나고 나서 혼자 기본 쿼리는 짤 수 있게 됐어요. 실습 위주 구성 덕분인 것 같습니다.", filteredComment: "솔직히 SQL이 이렇게 깊은 줄 몰랐는데 3주 지나고 나서 혼자 기본 쿼리는 짤 수 있게 됐어요. 실습 위주 구성 덕분인 것 같습니다.", commentCategory: "학습", commentFilterReason: "구체적 성장 피드백 (구어체 포함)", freeText: null },
    { speed: "moderate", comprehension: "medium", communication: 3, comment: "최종 프로젝트 주제가 너무 열려있어서 뭘 해야 할지 막막했어요. 예시 프로젝트 2~3개 정도만 보여주시면 방향 잡는 데 도움이 될 것 같아요.", filteredComment: "최종 프로젝트 주제가 너무 열려있어서 뭘 해야 할지 막막했어요. 예시 프로젝트 2~3개 정도만 보여주시면 방향 잡는 데 도움이 될 것 같아요.", commentCategory: "학습", commentFilterReason: "과제 구성에 대한 구체적 건설적 요청 (구어체 포함)", freeText: null },
    // ── 4주차 (뷰/저장 프로시저) ──
    { speed: "moderate", comprehension: "high", communication: 4, comment: "VIEW를 '자주 쓰는 복잡한 JOIN 쿼리에 이름표를 붙인 것'으로 설명하시고 바로 실습으로 넘어가니 활용법이 직관적으로 이해됐습니다.", filteredComment: "VIEW를 '자주 쓰는 복잡한 JOIN 쿼리에 이름표를 붙인 것'으로 설명하시고 바로 실습으로 넘어가니 활용법이 직관적으로 이해됐습니다.", commentCategory: "학습", commentFilterReason: "비유 활용 강의 방식에 대한 구체적 긍정 피드백", freeText: null },
    { speed: "fast", comprehension: "medium", communication: 3, comment: "저장 프로시저 문법이 BEGIN~END, DECLARE 같은 패턴이 등장해서 일반 SQL이랑 달라 헷갈렸습니다. 기본 구조 템플릿 슬라이드 하나만 있어도 따라가기 훨씬 쉬울 것 같아요.", filteredComment: "저장 프로시저 문법이 BEGIN~END, DECLARE 같은 패턴이 등장해서 일반 SQL이랑 달라 헷갈렸습니다. 기본 구조 템플릿 슬라이드 하나만 있어도 따라가기 훨씬 쉬울 것 같아요.", commentCategory: "학습", commentFilterReason: "자료 구성에 대한 구체적 건설적 요청", freeText: null },
    { speed: "moderate", comprehension: "medium", communication: 3, comment: null, filteredComment: null, commentCategory: null, commentFilterReason: null, freeText: null },
    { speed: "moderate", comprehension: "high", communication: 5, comment: "실습 DB가 실제 쇼핑몰 ERD 구조로 되어있어서 SELECT, JOIN, VIEW가 현실에서 어떻게 쓰이는지 체감이 됐습니다. 이런 식의 실전 맥락 실습을 앞으로도 유지해주시면 좋겠어요.", filteredComment: "실습 DB가 실제 쇼핑몰 ERD 구조로 되어있어서 SELECT, JOIN, VIEW가 현실에서 어떻게 쓰이는지 체감이 됐습니다. 이런 식의 실전 맥락 실습을 앞으로도 유지해주시면 좋겠어요.", commentCategory: "학습", commentFilterReason: "실습 구성에 대한 구체적 긍정 피드백", freeText: null },
    { speed: "moderate", comprehension: "medium", communication: 3, comment: "VIEW랑 서브쿼리 중 언제 VIEW를 만드는 게 맞는지 기준이 잘 모르겠어요. 예시 시나리오가 좀 더 있으면 판단하기 쉬울 것 같습니다.", filteredComment: "VIEW랑 서브쿼리 중 언제 VIEW를 만드는 게 맞는지 기준이 잘 모르겠어요. 예시 시나리오가 좀 더 있으면 판단하기 쉬울 것 같습니다.", commentCategory: "학습", commentFilterReason: "자료 구성에 대한 건설적 요청 (구어체 포함)", freeText: null },
    { speed: "fast", comprehension: "low", communication: 2, comment: "저장 프로시저 디버깅 방법을 전혀 안 알려주셔서 오류가 나면 뭘 해야 할지 막막했습니다. SHOW ERRORS 같은 기본 명령어 하나만 짚어주셔도 큰 도움이 될 것 같아요.", filteredComment: "저장 프로시저 디버깅 방법을 전혀 안 알려주셔서 오류가 나면 뭘 해야 할지 막막했습니다. SHOW ERRORS 같은 기본 명령어 하나만 짚어주셔도 큰 도움이 될 것 같아요.", commentCategory: "학습", commentFilterReason: "실습 지원에 대한 구체적 건설적 요청", freeText: null },
    // ── 5주차 (트리거/성능 최적화) ──
    { speed: "moderate", comprehension: "high", communication: 4, comment: "BEFORE/AFTER 트리거를 INSERT/UPDATE/DELETE 세 이벤트 조합으로 예시 시나리오와 함께 설명해주셔서 언제 어떤 트리거를 쓰는지 감이 잡혔습니다.", filteredComment: "BEFORE/AFTER 트리거를 INSERT/UPDATE/DELETE 세 이벤트 조합으로 예시 시나리오와 함께 설명해주셔서 언제 어떤 트리거를 쓰는지 감이 잡혔습니다.", commentCategory: "학습", commentFilterReason: "강의 구성에 대한 구체적 긍정 피드백", freeText: null },
    { speed: "moderate", comprehension: "medium", communication: 3, comment: "EXPLAIN 명령어로 실행 계획 보는 실습 시간이 짧아서 직접 써볼 기회가 없었습니다. 실습 SQL 파일로 배포해주시면 수업 후에도 연습할 수 있겠습니다.", filteredComment: "EXPLAIN 명령어로 실행 계획 보는 실습 시간이 짧아서 직접 써볼 기회가 없었습니다. 실습 SQL 파일로 배포해주시면 수업 후에도 연습할 수 있겠습니다.", commentCategory: "학습", commentFilterReason: "실습 지원에 대한 구체적 건설적 요청", freeText: null },
    { speed: "moderate", comprehension: "medium", communication: 3, comment: null, filteredComment: null, commentCategory: null, commentFilterReason: null, freeText: null },
    { speed: "slow", comprehension: "high", communication: 5, comment: "인덱스 없는 쿼리 0.8초 vs 인덱스 있는 쿼리 0.002초를 실시간으로 비교해주신 게 임팩트 있었습니다. 수치로 보니 인덱스 중요성이 완전히 실감났어요.", filteredComment: "인덱스 없는 쿼리 0.8초 vs 인덱스 있는 쿼리 0.002초를 실시간으로 비교해주신 게 임팩트 있었습니다. 수치로 보니 인덱스 중요성이 완전히 실감났어요.", commentCategory: "학습", commentFilterReason: "실습 시연에 대한 구체적 긍정 피드백", freeText: null },
    { speed: "fast", comprehension: "medium", communication: 3, comment: "커서(CURSOR) 사용 시점이 여전히 모호합니다. 집합 연산으로 해결할 수 있는 경우와 커서가 꼭 필요한 경우를 명확하게 구분해주시면 좋겠어요.", filteredComment: "커서(CURSOR) 사용 시점이 여전히 모호합니다. 집합 연산으로 해결할 수 있는 경우와 커서가 꼭 필요한 경우를 명확하게 구분해주시면 좋겠어요.", commentCategory: "학습", commentFilterReason: "개념 명확화에 대한 구체적 건설적 요청", freeText: null },
    { speed: "fast", comprehension: "low", communication: 2, comment: "성능 최적화 챕터가 ㅈ나 길었는데 EXPLAIN 실습 예시 두 개만 해도 됐을 것 같아요. 핵심만 짚고 넘어가주시면 훨씬 좋겠습니다.", filteredComment: "성능 최적화 챕터가 다소 길게 느껴졌습니다. EXPLAIN 실습 예시 위주로 핵심만 짚고 진행해주시면 더 효율적일 것 같아요.", commentCategory: "혼합", commentFilterReason: "수업 구성에 대한 불만이 있으나 비속어 포함", commentHasProfanity: true, freeText: null },
    // ── 6주차 (NoSQL/MongoDB, 진행 중 — 응답 4개) ──
    { speed: "moderate", comprehension: "high", communication: 4, comment: "MongoDB 도큐먼트를 JSON 형식으로 직접 보여주고 바로 insertOne/find 실습으로 넘어가니 관계형 DB와의 차이가 피부로 느껴졌습니다.", filteredComment: "MongoDB 도큐먼트를 JSON 형식으로 직접 보여주고 바로 insertOne/find 실습으로 넘어가니 관계형 DB와의 차이가 피부로 느껴졌습니다.", commentCategory: "학습", commentFilterReason: "강의 방식에 대한 구체적 긍정 피드백", freeText: null },
    { speed: "moderate", comprehension: "medium", communication: 3, comment: "집계 파이프라인($match, $group, $project)이 SQL의 WHERE/GROUP BY/SELECT와 대응되는 것 같은데, 그 비교표가 있으면 관계형 DB에서 NoSQL로 전환이 훨씬 쉬울 것 같아요.", filteredComment: "집계 파이프라인($match, $group, $project)이 SQL의 WHERE/GROUP BY/SELECT와 대응되는 것 같은데, 그 비교표가 있으면 관계형 DB에서 NoSQL로 전환이 훨씬 쉬울 것 같아요.", commentCategory: "학습", commentFilterReason: "자료 구성에 대한 구체적 건설적 요청", freeText: null },
    { speed: "moderate", comprehension: "medium", communication: 3, comment: null, filteredComment: null, commentCategory: null, commentFilterReason: null, freeText: null },
    { speed: "slow", comprehension: "high", communication: 5, comment: "Compass GUI로 도큐먼트를 시각적으로 탐색하면서 실습하니 처음 접하는 NoSQL인데도 금방 익숙해졌습니다. 이런 도구 활용 실습을 계속 유지해주세요.", filteredComment: "Compass GUI로 도큐먼트를 시각적으로 탐색하면서 실습하니 처음 접하는 NoSQL인데도 금방 익숙해졌습니다. 이런 도구 활용 실습을 계속 유지해주세요.", commentCategory: "학습", commentFilterReason: "실습 방식에 대한 구체적 긍정 피드백", freeText: null },
    { speed: "moderate", comprehension: "medium", communication: 3, comment: null, filteredComment: null, commentCategory: null, commentFilterReason: null, freeText: null },
    { speed: "moderate", comprehension: "medium", communication: 3, comment: null, filteredComment: null, commentCategory: null, commentFilterReason: null, freeText: null },
  ];

  // ═══════════════════════════════════════
  // 강의 생성 + 피드백 시딩
  // ═══════════════════════════════════════

  let totalFeedbacks = 0;
  const courseResults: { name: string; semester: string; category: string; prof: string; count: number }[] = [];

  // 김민수 상세 강의 2개 먼저 생성
  const rand5 = () => Math.floor(Math.random() * 5) + 1;

  const kimCourse1 = await prisma.course.create({
    data: { name: "인공지능 개론", semester: "2026-1", category: "컴퓨터과학", studentCount: 35, professorId: 김.id, hasAssignment: true, hasPractice: true },
  });

  // 인공지능 개론 라운드 먼저 생성 (1~8주차)
  const kimRounds1: { id: string; week: number }[] = [];
  for (let week = 1; week <= 8; week++) {
    const { startDate, endDate } = buildRoundDates(week);
    const r = await prisma.feedbackRound.create({
      data: { courseId: kimCourse1.id, week, label: `${week}주차`, startDate, endDate },
    });
    kimRounds1.push({ id: r.id, week });
  }

  // 5개씩 각 라운드에 연결 (순서대로 1주차~8주차)
  for (let i = 0; i < kimDetailedFeedbacks.length; i++) {
    const roundIndex = Math.floor(i / 5); // 0~7 → 1~8주차
    const roundId = kimRounds1[Math.min(roundIndex, kimRounds1.length - 1)].id;
    const fb = kimDetailedFeedbacks[i];
    await prisma.feedback.create({
      data: { courseId: kimCourse1.id, roundId, ...fb, interest: rand5(), assignment: rand5(), practice: rand5() },
    });
  }
  totalFeedbacks += kimDetailedFeedbacks.length;
  courseResults.push({ name: "인공지능 개론", semester: "2026-1", category: "컴퓨터과학", prof: "김민수", count: kimDetailedFeedbacks.length });

  const kimCourse2 = await prisma.course.create({
    data: { name: "데이터베이스", semester: "2026-1", category: "컴퓨터과학", studentCount: 30, professorId: 김.id, hasAssignment: true, hasPractice: false },
  });

  // 데이터베이스 라운드 먼저 생성 (1~6주차)
  const kimRounds2: { id: string; week: number }[] = [];
  for (let week = 1; week <= 6; week++) {
    const { startDate, endDate } = buildRoundDates(week);
    const r = await prisma.feedbackRound.create({
      data: { courseId: kimCourse2.id, week, label: `${week}주차`, startDate, endDate },
    });
    kimRounds2.push({ id: r.id, week });
  }

  // 6개씩 각 라운드에 연결 (순서대로 1주차~6주차)
  for (let i = 0; i < kimDetailedFeedbacks2.length; i++) {
    const roundIndex = Math.floor(i / 6);
    const roundId = kimRounds2[Math.min(roundIndex, kimRounds2.length - 1)].id;
    const fb = kimDetailedFeedbacks2[i];
    await prisma.feedback.create({
      data: { courseId: kimCourse2.id, roundId, ...fb, interest: rand5(), assignment: rand5() },
    });
  }
  totalFeedbacks += kimDetailedFeedbacks2.length;
  courseResults.push({ name: "데이터베이스", semester: "2026-1", category: "컴퓨터과학", prof: "김민수", count: kimDetailedFeedbacks2.length });

  // 나머지 강의 (김민수 2026-1 2개 제외)
  const remaining = courseData.filter(
    ([prof, name, sem]) =>
      !(prof.id === 김.id && sem === "2026-1" && (name === "인공지능 개론" || name === "데이터베이스"))
  );

  for (const [prof, name, semester, category, count, bias, students] of remaining) {
    const course = await prisma.course.create({
      data: { name, semester, category, studentCount: students, professorId: prof.id },
    });
    const n = await seedFeedbacks(course.id, count, bias);
    totalFeedbacks += n;
    courseResults.push({ name, semester, category, prof: prof.name, count: n });
  }

  // ═══════════════════════════════════════
  // 학생 시스템 시드 (김민수 2026-1 강의 대상)
  // ═══════════════════════════════════════

  const studentData = [
    { studentNo: "2021001", name: "홍길동", email: "hong@hansung.ac.kr", department: "컴퓨터공학과" },
    { studentNo: "2021002", name: "김철수", email: "chulsu@hansung.ac.kr", department: "컴퓨터공학과" },
    { studentNo: "2021003", name: "이수진", email: "sujin@hansung.ac.kr", department: "컴퓨터공학과" },
    { studentNo: "2022001", name: "박지민", email: "jimin@hansung.ac.kr", department: "컴퓨터공학과" },
    { studentNo: "2022002", name: "최유리", email: "yuri@hansung.ac.kr", department: "소프트웨어학과" },
    { studentNo: "2022003", name: "정민호", email: "minho@hansung.ac.kr", department: "소프트웨어학과" },
    { studentNo: "2023001", name: "한소희", email: "sohee@hansung.ac.kr", department: "컴퓨터공학과" },
    { studentNo: "2023002", name: "윤서연", email: "seoyeon@hansung.ac.kr", department: "소프트웨어학과" },
    { studentNo: "2023003", name: "강태호", email: "taeho@hansung.ac.kr", department: "컴퓨터공학과" },
    { studentNo: "2024001", name: "오하늘", email: "haneul@hansung.ac.kr", department: "컴퓨터공학과" },
  ];

  const students = await Promise.all(
    studentData.map((s) => prisma.student.create({ data: s }))
  );

  // 김민수 2026-1 강의 2개에 학생 수강 등록 + 토큰 발급
  const kimCourses = [kimCourse1, kimCourse2];
  for (const course of kimCourses) {
    for (const student of students) {
      await prisma.courseStudent.create({
        data: { courseId: course.id, studentId: student.id },
      });
      await prisma.studentCourseToken.create({
        data: {
          token: crypto.randomBytes(16).toString("hex"),
          courseId: course.id,
          studentId: student.id,
        },
      });
    }
  }

  // 피드백 라운드 — 2026-03-03(1주차) 기준, 1주일 단위
  function buildRoundDates(week: number) {
    const semesterStart = new Date("2026-03-03T09:00:00");
    const startDate = new Date(semesterStart);
    startDate.setDate(startDate.getDate() + (week - 1) * 7);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);
    return { startDate, endDate };
  }

  console.log(`Students: ${students.length}명`);
  console.log(`Enrollments: ${students.length * kimCourses.length}건`);
  console.log(`Student tokens: ${students.length * kimCourses.length}개`);
  console.log(`Feedback rounds: 14개 (인공지능 개론 8주차 + 데이터베이스 6주차, 3월 3일 기준)\n`);

  // ═══════════════════════════════════════
  // ImprovementNote 데모 데이터
  // ═══════════════════════════════════════

  const joAiCourse = await prisma.course.findFirst({
    where: { name: "AI와 사회", semester: "2026-1" },
    select: { id: true },
  });
  const kangMgmtCourse = await prisma.course.findFirst({
    where: { name: "경영학원론" },
    select: { id: true },
  });
  const parkCompCourse = await prisma.course.findFirst({
    where: { name: "컴퓨터구조" },
    select: { id: true },
  });

  if (joAiCourse) {
    await prisma.improvementNote.createMany({
      data: [
        {
          courseId: joAiCourse.id,
          category: "교양",
          axis: "comprehension",
          changeDelta: 22,
          note: "매 수업 도입부에 지난 주 내용을 5분간 복습하는 시간을 넣었습니다. 학생들이 연결고리를 찾는 데 도움이 된 것 같습니다.",
        },
        {
          courseId: joAiCourse.id,
          category: "교양",
          axis: "comprehension",
          changeDelta: 18,
          note: "슬라이드 한 장당 핵심 키워드를 3개 이내로 줄이고, 나머지는 구두 설명으로 대체했습니다. 화면이 단순해지니 집중도가 올랐습니다.",
        },
        {
          courseId: joAiCourse.id,
          category: "교양",
          axis: "communication",
          changeDelta: 0.9,
          note: "수업 중 익명 질문 앱을 도입했습니다. 질문을 부끄러워하던 학생들도 적극적으로 참여하기 시작했어요.",
        },
        {
          courseId: joAiCourse.id,
          category: "교양",
          axis: "speed",
          changeDelta: 18,
          note: "개념 설명 후 학생들이 1분간 스스로 정리하는 시간을 줬습니다. 속도 조절이 자연스럽게 됐고 이해도도 올라갔습니다.",
        },
      ],
    });
  }

  if (kangMgmtCourse) {
    await prisma.improvementNote.createMany({
      data: [
        {
          courseId: kangMgmtCourse.id,
          category: "경영·경제",
          axis: "communication",
          changeDelta: 1.1,
          note: "수업 종료 10분 전에 오늘 배운 내용 중 가장 어려웠던 점을 익명으로 제출하게 했습니다. 다음 수업에서 그 내용을 먼저 풀어주니 소통이 크게 개선됐습니다.",
        },
        {
          courseId: kangMgmtCourse.id,
          category: "경영·경제",
          axis: "comprehension",
          changeDelta: 16,
          note: "이론 설명 후 실제 기업 사례를 1~2개씩 추가했습니다. 현실 적용 사례를 보여주니 이해도가 눈에 띄게 올라갔습니다.",
        },
      ],
    });
  }

  if (parkCompCourse) {
    await prisma.improvementNote.create({
      data: {
        courseId: parkCompCourse.id,
        category: "컴퓨터과학",
        axis: "comprehension",
        changeDelta: 15,
        note: "어려운 개념은 그림과 도식으로 먼저 설명한 뒤 텍스트 정의를 보여줬습니다. 순서를 바꿨을 뿐인데 이해도 반응이 달라졌습니다.",
      },
    });
  }

  // 범용 팁 (다른 분야에서도 통할 수 있는 것) — kimCourse1 사용
  await prisma.improvementNote.create({
    data: {
      courseId: kimCourse1.id,
      category: "컴퓨터과학",
      axis: "speed",
      changeDelta: 20,
      note: "슬라이드 발표 중 학생 반응을 보며 '여기까지 이해됐나요?' 체크를 추가했습니다. 자연스럽게 속도가 조절됐습니다.",
    },
  });

  console.log("ImprovementNote: 데모 노트 8건 추가");

  // ═══════════════════════════════════════
  // 결과 출력
  // ═══════════════════════════════════════

  console.log("Demo data seeded successfully!\n");
  console.log(`Professors: ${professors.length}명`);
  console.log(`Courses: ${courseResults.length}개`);
  console.log(`Feedbacks: ${totalFeedbacks}개\n`);

  console.log("── 메인 데모 계정 ──");
  console.log("  김민수 (kim@hansung.ac.kr) / demo1234\n");

  console.log("── 전체 계정 (비밀번호 모두 demo1234) ──");
  for (const p of professors) {
    console.log(`  ${p.name} (${p.email})`);
  }

  console.log("\n── 강의 목록 ──");
  const semesters = ["2025-1", "2025-2", "2026-1"];
  for (const sem of semesters) {
    const semCourses = courseResults.filter((c) => c.semester === sem);
    if (semCourses.length === 0) continue;
    console.log(`\n  [${sem}]`);
    for (const c of semCourses) {
      console.log(`    ${c.name} (${c.category}, ${c.prof}, ${c.count} feedbacks)`);
    }
  }

  console.log("\n── 개선 사례 기대값 ──");
  console.log("  이영희: 프로그래밍 기초(low) → 자료구조(mid) → 알고리즘(high)");
  console.log("  박준혁: 시스템프로그래밍(low) → 컴퓨터구조(low) → 운영체제(high)");
  console.log("  강태영: 마케팅원론(low) → 경영학원론(high)");
  console.log("  조성민: 디지털 리터러시(low) → 테크놀로지와 윤리(low) → AI와 사회(high)");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
