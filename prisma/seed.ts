import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import path from "node:path";

const dbUrl = process.env.DATABASE_URL ?? `file:${path.join(process.cwd(), "dev.db")}`;
const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: dbUrl }),
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
    { speed: "moderate", comprehension: "high", communication: 4, comment: "AI의 역사부터 현재 트렌드까지 체계적으로 설명해주셔서 왜 이 과목을 배워야 하는지 맥락이 잡혔습니다. 첫 수업치고 구성이 좋았어요.", filteredComment: "AI의 역사부터 현재 트렌드까지 체계적으로 설명해주셔서 왜 이 과목을 배워야 하는지 맥락이 잡혔습니다. 첫 수업치고 구성이 좋았어요.", commentCategory: "학습", commentFilterReason: "구체적인 긍정 피드백" },
    { speed: "fast", comprehension: "medium", communication: 3, comment: "개념을 너무 빠르게 훑고 넘어가서 따라가기 벅찼습니다. 도입부 개념에 배경지식이 없는 학생도 있으니 조금 더 천천히 진행해주시면 좋겠어요.", filteredComment: "개념을 너무 빠르게 훑고 넘어가서 따라가기 벅찼습니다. 도입부 개념에 배경지식이 없는 학생도 있으니 조금 더 천천히 진행해주시면 좋겠어요.", commentCategory: "학습", commentFilterReason: "수업 속도에 대한 건설적 피드백" },
    { speed: "moderate", comprehension: "medium", communication: 3, comment: null, filteredComment: null, commentCategory: null, commentFilterReason: null },
    { speed: "slow", comprehension: "high", communication: 5, comment: "각 개념마다 왜 등장했는지 역사적 맥락을 먼저 설명해주셔서 이해가 자연스럽게 됐습니다. 이런 방식 정말 좋아요.", filteredComment: "각 개념마다 왜 등장했는지 역사적 맥락을 먼저 설명해주셔서 이해가 자연스럽게 됐습니다. 이런 방식 정말 좋아요.", commentCategory: "학습", commentFilterReason: "강의 방식에 대한 구체적 긍정 피드백" },
    { speed: "moderate", comprehension: "medium", communication: 4, comment: "솔직히 첫 수업이라 AI가 뭔지 막막했는데, 전체 맵을 그려주시니까 앞으로 배울 내용이 어디에 해당하는지 보여서 좋았어요. 다음 주가 기대됩니다.", filteredComment: "솔직히 첫 수업이라 AI가 뭔지 막막했는데, 전체 맵을 그려주시니까 앞으로 배울 내용이 어디에 해당하는지 보여서 좋았어요. 다음 주가 기대됩니다.", commentCategory: "학습", commentFilterReason: "구체적인 긍정 피드백 (구어체 포함)" },
    // ── 2주차 (머신러닝 기초, 약간 어려움) ──
    { speed: "fast", comprehension: "low", communication: 2, comment: "선형회귀 수식 유도 부분에서 PPT를 너무 빠르게 넘겨서 필기를 놓쳤습니다. 수식은 칠판에 직접 쓰거나 페이지당 2분 정도 멈춰주시면 좋겠어요.", filteredComment: "선형회귀 수식 유도 부분에서 PPT를 너무 빠르게 넘겨서 필기를 놓쳤습니다. 수식은 칠판에 직접 쓰거나 페이지당 2분 정도 멈춰주시면 좋겠어요.", commentCategory: "학습", commentFilterReason: "수업 진행 방식에 대한 구체적 건설적 피드백" },
    { speed: "moderate", comprehension: "medium", communication: 3, comment: "이론 설명은 이해됐는데 이게 실제로 어디에 쓰이는지 예시가 없어서 공중에 뜬 느낌입니다. 넷플릭스 추천이나 스팸 필터 같은 사례를 들어주시면 이해가 훨씬 빠를 것 같아요.", filteredComment: "이론 설명은 이해됐는데 이게 실제로 어디에 쓰이는지 예시가 없어서 공중에 뜬 느낌입니다. 넷플릭스 추천이나 스팸 필터 같은 사례를 들어주시면 이해가 훨씬 빠를 것 같아요.", commentCategory: "학습", commentFilterReason: "자료 개선에 대한 구체적 건설적 요청" },
    { speed: "moderate", comprehension: "high", communication: 4, comment: "비용 함수를 그래프로 시각화해서 보여주신 게 정말 좋았습니다. 수식만 보면 감이 안 잡히는데 그래프로 보니까 경사하강법이 왜 작동하는지 바로 이해됐어요.", filteredComment: "비용 함수를 그래프로 시각화해서 보여주신 게 정말 좋았습니다. 수식만 보면 감이 안 잡히는데 그래프로 보니까 경사하강법이 왜 작동하는지 바로 이해됐어요.", commentCategory: "학습", commentFilterReason: "강의 방식에 대한 구체적 긍정 피드백" },
    { speed: "fast", comprehension: "medium", communication: 3, comment: "수식이 많아서 어렵긴 한데, 단계별로 유도해주셔서 그나마 따라갔어요. 근데 gradient 계산 부분은 좀 더 천천히 해주시면 좋겠습니다.", filteredComment: "수식이 많아서 어렵긴 한데, 단계별로 유도해주셔서 그나마 따라갔어요. 근데 gradient 계산 부분은 좀 더 천천히 해주시면 좋겠습니다.", commentCategory: "학습", commentFilterReason: "구체적인 혼합 피드백 (구어체 포함)" },
    { speed: "moderate", comprehension: "low", communication: 2, comment: "overfitting, regularization 같은 전문 용어를 처음 등장할 때 정의 없이 쓰셔서 따라가기 힘들었습니다. 처음 나오는 용어는 한 줄 정의라도 넣어주시면 좋겠어요.", filteredComment: "overfitting, regularization 같은 전문 용어를 처음 등장할 때 정의 없이 쓰셔서 따라가기 힘들었습니다. 처음 나오는 용어는 한 줄 정의라도 넣어주시면 좋겠어요.", commentCategory: "학습", commentFilterReason: "자료 난이도에 대한 구체적 건설적 피드백" },
    // ── 3주차 (신경망, 중간 수준) ──
    { speed: "moderate", comprehension: "high", communication: 5, comment: "역전파 알고리즘을 애니메이션으로 보여주신 게 완전 신의 한 수였어요. 다른 수업에서 두 번이나 들었는데도 이해 못했던 부분인데 이번에 드디어 이해됐습니다.", filteredComment: "역전파 알고리즘을 애니메이션으로 보여주신 게 완전 신의 한 수였어요. 다른 수업에서 두 번이나 들었는데도 이해 못했던 부분인데 이번에 드디어 이해됐습니다.", commentCategory: "학습", commentFilterReason: "구체적인 긍정 피드백 (구어체 포함)" },
    { speed: "moderate", comprehension: "medium", communication: 4, comment: "이론은 어느 정도 이해됐는데, 실습 시간이 너무 짧아서 직접 구현해볼 시간이 없었습니다. 코드를 같이 작성하는 시간이 30분만 있어도 이해도가 훨씬 올라갈 것 같아요.", filteredComment: "이론은 어느 정도 이해됐는데, 실습 시간이 너무 짧아서 직접 구현해볼 시간이 없었습니다. 코드를 같이 작성하는 시간이 30분만 있어도 이해도가 훨씬 올라갈 것 같아요.", commentCategory: "학습", commentFilterReason: "실습 시간에 대한 구체적 건설적 요청" },
    { speed: "fast", comprehension: "low", communication: 2, comment: "코드를 슬라이드에 올려놓고 설명하시는데, 실행 결과 없이 코드만 보여주시니까 '이게 실제로 어떻게 작동하는 건지' 감이 안 잡혔습니다. Jupyter 노트북으로 실시간 실행하면서 보여주시면 좋겠어요.", filteredComment: "코드를 슬라이드에 올려놓고 설명하시는데, 실행 결과 없이 코드만 보여주시니까 감이 안 잡혔습니다. Jupyter 노트북으로 실시간 실행하면서 보여주시면 좋겠어요.", commentCategory: "학습", commentFilterReason: "강의 방식에 대한 구체적 건설적 제안" },
    { speed: "moderate", comprehension: "high", communication: 4, comment: null, filteredComment: null, commentCategory: null, commentFilterReason: null },
    { speed: "fast", comprehension: "medium", communication: 3, comment: "솔직히 엄청 어렵긴 한데 그래도 배우는 게 확실히 많은 수업이에요. 어렵다고 포기하기보단 따라가려고 노력하게 되는 수업입니다.", filteredComment: "솔직히 엄청 어렵긴 한데 그래도 배우는 게 확실히 많은 수업이에요. 어렵다고 포기하기보단 따라가려고 노력하게 되는 수업입니다.", commentCategory: "학습", commentFilterReason: "솔직한 혼합 평가 (구어체 포함)" },
    // ── 4주차 (실습 강화, 긍정 상승) ──
    { speed: "moderate", comprehension: "high", communication: 4, comment: "이번 주 실습 과제 난이도가 딱 적당했습니다. 이론을 복습하면서 동시에 구현까지 해볼 수 있어서 개념이 확실히 정리됐어요.", filteredComment: "이번 주 실습 과제 난이도가 딱 적당했습니다. 이론을 복습하면서 동시에 구현까지 해볼 수 있어서 개념이 확실히 정리됐어요.", commentCategory: "학습", commentFilterReason: "과제에 대한 구체적 긍정 피드백" },
    { speed: "slow", comprehension: "high", communication: 5, comment: "학생 반응을 보면서 속도를 조절해주신 게 느껴졌어요. 이번 주는 처음으로 수업 내용을 완전히 따라갔다는 느낌이 들었습니다.", filteredComment: "학생 반응을 보면서 속도를 조절해주신 게 느껴졌어요. 이번 주는 처음으로 수업 내용을 완전히 따라갔다는 느낌이 들었습니다.", commentCategory: "학습", commentFilterReason: "강의 방식에 대한 구체적 긍정 피드백" },
    { speed: "moderate", comprehension: "medium", communication: 3, comment: "수업 중 질문 시간이 마지막에만 있는데, 중간에 1~2분씩 짧게 있으면 흐름을 놓치지 않을 것 같습니다. 마지막에 몰아서 하면 질문 내용을 까먹기도 하고요.", filteredComment: "수업 중 질문 시간이 마지막에만 있는데, 중간에 1~2분씩 짧게 있으면 흐름을 놓치지 않을 것 같습니다. 마지막에 몰아서 하면 질문 내용을 까먹기도 하고요.", commentCategory: "학습", commentFilterReason: "소통 방식에 대한 구체적 건설적 요청" },
    { speed: "moderate", comprehension: "high", communication: 5, comment: "실습 시간이 늘어나고 나서 수업이 훨씬 재미있어졌습니다. 직접 구현해보면서 이해도가 확 올라갔고, 이론과 코드가 연결되는 게 느껴져요.", filteredComment: "실습 시간이 늘어나고 나서 수업이 훨씬 재미있어졌습니다. 직접 구현해보면서 이해도가 확 올라갔고, 이론과 코드가 연결되는 게 느껴져요.", commentCategory: "학습", commentFilterReason: "수업 구성 변화에 대한 구체적 긍정 피드백" },
    { speed: "moderate", comprehension: "medium", communication: 4, comment: "지금까지 중에 가장 좋은 수업이었습니다. 실습 늘어난 거 계속 유지해주세요!", filteredComment: "지금까지 중에 가장 좋은 수업이었습니다. 실습 늘어난 거 계속 유지해주세요!", commentCategory: "학습", commentFilterReason: "전반적 긍정 피드백" },
    // ── 5주차 (심화, 불만 증가) ──
    { speed: "fast", comprehension: "medium", communication: 3, comment: "심화 내용으로 넘어가면서 속도가 다시 빨라졌습니다. 3~4주차 속도가 좋았는데 그 페이스로 유지해주시면 좋겠어요. 중간에 5분 정도 이전 내용 정리 시간도 있으면 좋을 것 같고요.", filteredComment: "심화 내용으로 넘어가면서 속도가 다시 빨라졌습니다. 3~4주차 속도가 좋았는데 그 페이스로 유지해주시면 좋겠어요. 중간에 5분 정도 이전 내용 정리 시간도 있으면 좋을 것 같고요.", commentCategory: "학습", commentFilterReason: "수업 속도에 대한 구체적 건설적 요청" },
    { speed: "moderate", comprehension: "medium", communication: 3, comment: "조별 과제가 다른 과목 마감이랑 겹쳐서 굉장히 부담됐습니다. 과제 마감 일정을 미리 학기 초에 공지해주시거나, 다른 과목 마감 주간은 피해주시면 좋겠어요.", filteredComment: "조별 과제가 다른 과목 마감이랑 겹쳐서 굉장히 부담됐습니다. 과제 마감 일정을 미리 학기 초에 공지해주시거나, 다른 과목 마감 주간은 피해주시면 좋겠어요.", commentCategory: "학습", commentFilterReason: "과제 일정에 대한 구체적 건설적 피드백" },
    { speed: "fast", comprehension: "low", communication: 1, comment: "교수님 설명 진짜 개못함. 혼자 중얼거리면서 수업하지 마세요.", filteredComment: "설명이 불명확하고 전달력이 부족합니다. 학생들과 눈 맞춤을 더 해주시면 좋겠습니다.", commentCategory: "혼합", commentFilterReason: "설명 방식에 대한 불만이 있으나 비속어 포함", commentHasProfanity: true },
    { speed: "fast", comprehension: "low", communication: 1, comment: "이 수업 듣느니 차라리 자는 게 나음 ㅋㅋ 시간 아까움", filteredComment: null, commentCategory: "감정", commentFilterReason: "비건설적 불만 및 조롱" },
    { speed: "fast", comprehension: "low", communication: 1, comment: "질문했을 때 무시당하는 느낌을 받아서 수업에 집중하기 힘들었습니다. 질문이 틀렸어도 '이런 관점도 있구나' 하는 식으로 받아주시면 더 편하게 질문할 수 있을 것 같아요.", filteredComment: "질문했을 때 무시당하는 느낌을 받아서 수업에 집중하기 힘들었습니다. 질문이 틀렸어도 '이런 관점도 있구나' 하는 식으로 받아주시면 더 편하게 질문할 수 있을 것 같아요.", commentCategory: "학습", commentFilterReason: "소통 방식에 대한 솔직한 건설적 피드백" },
    { speed: "slow", comprehension: "high", communication: 5, comment: "마지막에 이번 주 내용을 한 장으로 요약해주시는 게 정말 도움됩니다. 어려운 내용을 들은 뒤 복습 슬라이드로 정리되는 느낌이에요.", filteredComment: "마지막에 이번 주 내용을 한 장으로 요약해주시는 게 정말 도움됩니다. 어려운 내용을 들은 뒤 복습 슬라이드로 정리되는 느낌이에요.", commentCategory: "학습", commentFilterReason: "수업 구성에 대한 구체적 긍정 피드백" },
    // ── 6주차 (CNN/합성곱 신경망) ──
    { speed: "moderate", comprehension: "high", communication: 5, comment: "Conv2D 필터가 이미지 위를 슬라이딩하며 특징을 추출하는 과정을 격자 애니메이션으로 보여주신 덕분에 '합성곱'이 왜 그 이름인지 직관적으로 이해됐습니다.", filteredComment: "Conv2D 필터가 이미지 위를 슬라이딩하며 특징을 추출하는 과정을 격자 애니메이션으로 보여주신 덕분에 '합성곱'이 왜 그 이름인지 직관적으로 이해됐습니다.", commentCategory: "학습", commentFilterReason: "강의 방식에 대한 구체적 긍정 피드백" },
    { speed: "fast", comprehension: "medium", communication: 3, comment: "Max pooling vs average pooling 차이 설명이 빠르게 넘어갔는데, 결과 이미지를 나란히 비교해서 보여주시면 어떤 상황에 뭘 쓸지 판단 기준이 잡힐 것 같아요.", filteredComment: "Max pooling vs average pooling 차이 설명이 빠르게 넘어갔는데, 결과 이미지를 나란히 비교해서 보여주시면 어떤 상황에 뭘 쓸지 판단 기준이 잡힐 것 같아요.", commentCategory: "학습", commentFilterReason: "수업 속도에 대한 구체적 건설적 피드백" },
    { speed: "moderate", comprehension: "medium", communication: 4, comment: null, filteredComment: null, commentCategory: null, commentFilterReason: null },
    { speed: "slow", comprehension: "high", communication: 4, comment: "고양이/개 이미지 분류 모델을 훈련 과정부터 실시간으로 돌려주신 게 인상적이었습니다. 정확도가 epoch마다 올라가는 걸 직접 보니 이론이 실제로 작동한다는 게 실감났어요.", filteredComment: "고양이/개 이미지 분류 모델을 훈련 과정부터 실시간으로 돌려주신 게 인상적이었습니다. 정확도가 epoch마다 올라가는 걸 직접 보니 이론이 실제로 작동한다는 게 실감났어요.", commentCategory: "학습", commentFilterReason: "실습 시연에 대한 구체적 긍정 피드백" },
    { speed: "fast", comprehension: "medium", communication: 3, comment: "Keras로 CNN 짜는 실습 시간이 너무 짧았어요. 레이어 쌓는 것까지만 하고 끝나서 학습까지 돌려보고 싶었는데 아쉬웠습니다. 실습 노트북 파일로 나눠주시면 집에서라도 해볼 수 있겠어요.", filteredComment: "Keras로 CNN 짜는 실습 시간이 너무 짧았어요. 레이어 쌓는 것까지만 하고 끝나서 학습까지 돌려보고 싶었는데 아쉬웠습니다. 실습 노트북 파일로 나눠주시면 집에서라도 해볼 수 있겠어요.", commentCategory: "학습", commentFilterReason: "실습 시간에 대한 구체적 건설적 요청" },
    // ── 7주차 (RNN/LSTM/시계열) ──
    { speed: "moderate", comprehension: "high", communication: 4, comment: "기울기 소실 문제를 그래프로 시각화한 뒤 LSTM의 게이트 구조가 이를 어떻게 해결하는지 자연스럽게 연결해주셔서 '왜 LSTM인가'가 완전히 납득됐습니다.", filteredComment: "기울기 소실 문제를 그래프로 시각화한 뒤 LSTM의 게이트 구조가 이를 어떻게 해결하는지 자연스럽게 연결해주셔서 '왜 LSTM인가'가 완전히 납득됐습니다.", commentCategory: "학습", commentFilterReason: "강의 구성에 대한 구체적 긍정 피드백" },
    { speed: "moderate", comprehension: "medium", communication: 3, comment: "GRU와 LSTM 비교에서 파라미터 수 차이만 언급됐는데, 실제 태스크별 성능 벤치마크가 있으면 언제 뭘 선택해야 할지 판단에 도움이 될 것 같아요.", filteredComment: "GRU와 LSTM 비교에서 파라미터 수 차이만 언급됐는데, 실제 태스크별 성능 벤치마크가 있으면 언제 뭘 선택해야 할지 판단에 도움이 될 것 같아요.", commentCategory: "학습", commentFilterReason: "자료 구성에 대한 구체적 건설적 요청" },
    { speed: "moderate", comprehension: "medium", communication: 3, comment: null, filteredComment: null, commentCategory: null, commentFilterReason: null },
    { speed: "slow", comprehension: "high", communication: 5, comment: "RNN을 unfolded 형태로 펼쳐서 타임스텝별로 설명해주시니 입력이 어떻게 흐르는지 한눈에 들어왔습니다. 그 전까진 순환 다이어그램이 계속 헷갈렸는데 이번에 완전히 정리됐어요.", filteredComment: "RNN을 unfolded 형태로 펼쳐서 타임스텝별로 설명해주시니 입력이 어떻게 흐르는지 한눈에 들어왔습니다. 그 전까진 순환 다이어그램이 계속 헷갈렸는데 이번에 완전히 정리됐어요.", commentCategory: "학습", commentFilterReason: "구체적인 긍정 피드백 (구어체 포함)" },
    { speed: "fast", comprehension: "low", communication: 2, comment: "시계열 예측 실습이 MNIST 분류로 대체됐는데, LSTM 본래 강점인 시계열 데이터(주가, 날씨 등)로 실습했으면 개념이 더 잘 연결됐을 것 같습니다.", filteredComment: "시계열 예측 실습이 MNIST 분류로 대체됐는데, LSTM 본래 강점인 시계열 데이터(주가, 날씨 등)로 실습했으면 개념이 더 잘 연결됐을 것 같습니다.", commentCategory: "학습", commentFilterReason: "실습 주제에 대한 구체적 건설적 피드백" },
    // ── 8주차 (Transformer/LLM, 진행 중 — 응답 3개) ──
    { speed: "fast", comprehension: "medium", communication: 3, comment: "Transformer의 Self-attention이 처음이라 복잡한데, 기존 RNN과 어떻게 다른지 구조 비교 시각화가 있으면 이해가 빠를 것 같아요.", filteredComment: "Transformer의 Self-attention이 처음이라 복잡한데, 기존 RNN과 어떻게 다른지 구조 비교 시각화가 있으면 이해가 빠를 것 같아요.", commentCategory: "학습", commentFilterReason: "자료 개선에 대한 구체적 건설적 요청" },
    { speed: "moderate", comprehension: "high", communication: 4, comment: "GPT 동작 원리를 실제 ChatGPT 응답 예시로 보여주시니 '다음 토큰 예측'이 이렇게 단순한 원리였구나 하고 놀랐습니다. AI 과목 마무리 주제로 딱 어울려요.", filteredComment: "GPT 동작 원리를 실제 ChatGPT 응답 예시로 보여주시니 '다음 토큰 예측'이 이렇게 단순한 원리였구나 하고 놀랐습니다. AI 과목 마무리 주제로 딱 어울려요.", commentCategory: "학습", commentFilterReason: "강의 주제와 방식에 대한 구체적 긍정 피드백" },
    { speed: "moderate", comprehension: "medium", communication: 3, comment: null, filteredComment: null, commentCategory: null, commentFilterReason: null },
    { speed: "moderate", comprehension: "medium", communication: 4, comment: null, filteredComment: null, commentCategory: null, commentFilterReason: null },
    { speed: "slow", comprehension: "high", communication: 4, comment: null, filteredComment: null, commentCategory: null, commentFilterReason: null },
  ];

  // 데이터베이스 — 주차별 6개씩 (1~6주차, 총 36개)
  const kimDetailedFeedbacks2 = [
    // ── 1주차 (관계형 DB 기초, ERD, DDL, 1NF) ──
    { speed: "slow", comprehension: "high", communication: 5,
      comment: "1대다·다대다 카디널리티를 Crow's Foot 표기법으로 도서관 예시에 직접 그려가며 설명해주신 덕분에 ERD가 왜 필요한지 바로 납득됐습니다. 추상적인 개념이 구체적인 그림으로 연결되는 순간이었어요.",
      filteredComment: "1대다·다대다 카디널리티를 Crow's Foot 표기법으로 도서관 예시에 직접 그려가며 설명해주신 덕분에 ERD가 왜 필요한지 바로 납득됐습니다. 추상적인 개념이 구체적인 그림으로 연결되는 순간이었어요.",
      commentCategory: "학습", commentFilterReason: "ERD 강의 방식에 대한 구체적 긍정 피드백" },
    { speed: "fast", comprehension: "medium", communication: 3,
      comment: "CREATE TABLE 실습하실 때 화면 폰트가 작아서 뒤에서 따라가기 힘들었습니다. NOT NULL·UNIQUE·CHECK 제약조건 타이핑하실 때 폰트 16pt 이상으로 키워주시면 좋겠어요.",
      filteredComment: "CREATE TABLE 실습하실 때 화면 폰트가 작아서 뒤에서 따라가기 힘들었습니다. NOT NULL·UNIQUE·CHECK 제약조건 타이핑하실 때 폰트 16pt 이상으로 키워주시면 좋겠어요.",
      commentCategory: "학습", commentFilterReason: "실습 환경에 대한 구체적 건설적 요청" },
    { speed: "moderate", comprehension: "high", communication: 4,
      comment: "DBMS와 파일시스템 비교표에서 데이터 중복, 무결성, 동시성 항목을 나란히 보여주시니 왜 DBMS가 필요한지 설득력 있게 이해됐습니다. 파일 시스템만 쓰다가 실수했던 경험이 떠올라 공감됐어요.",
      filteredComment: "DBMS와 파일시스템 비교표에서 데이터 중복, 무결성, 동시성 항목을 나란히 보여주시니 왜 DBMS가 필요한지 설득력 있게 이해됐습니다.",
      commentCategory: "학습", commentFilterReason: "비교표 활용 강의 방식에 대한 구체적 긍정 피드백" },
    { speed: "moderate", comprehension: "medium", communication: 3,
      comment: "PK·FK·CK·SK·AK 다섯 가지 키 개념이 한 슬라이드에 나열되어 있어서 각각 언제 쓰는지 구분이 잘 안 됩니다. PK와 FK를 먼저 완전히 정리하고 나머지는 예시 중심으로 설명해주시면 더 좋겠어요.",
      filteredComment: "PK·FK·CK·SK·AK 다섯 가지 키 개념이 한 슬라이드에 나열되어 있어서 각각 언제 쓰는지 구분이 잘 안 됩니다. PK와 FK를 먼저 완전히 정리하고 나머지는 예시 중심으로 설명해주시면 더 좋겠어요.",
      commentCategory: "학습", commentFilterReason: "키 개념 설명 순서에 대한 구체적 건설적 요청" },
    { speed: "fast", comprehension: "low", communication: 2,
      comment: "1정규형 설명하실 때 비정규 테이블→정규화 테이블 비교 슬라이드를 너무 빨리 넘기셔서 두 테이블의 차이를 다 못 봤습니다. 예제 테이블은 최소 1분 이상 유지해주시면 좋겠어요.",
      filteredComment: "1정규형 설명하실 때 비정규→정규화 테이블 비교 슬라이드를 너무 빨리 넘기셔서 두 테이블의 차이를 다 못 봤습니다. 예제 테이블은 최소 1분 이상 유지해주시면 좋겠어요.",
      commentCategory: "학습", commentFilterReason: "수업 속도에 대한 구체적 건설적 피드백" },
    { speed: "moderate", comprehension: "medium", communication: 3,
      comment: null, filteredComment: null, commentCategory: null, commentFilterReason: null },
    { speed: "slow", comprehension: "high", communication: 5,
      comment: "NOT NULL, UNIQUE, CHECK, DEFAULT 네 가지 제약조건을 각각 위반하는 INSERT를 실습으로 직접 실행해보고 오류 메시지를 확인하니 제약조건이 왜 필요한지 몸으로 익혀졌습니다.",
      filteredComment: "NOT NULL, UNIQUE, CHECK, DEFAULT 네 가지 제약조건을 각각 위반하는 INSERT를 실습으로 직접 실행해보고 오류 메시지를 확인하니 제약조건이 왜 필요한지 몸으로 익혀졌습니다.",
      commentCategory: "학습", commentFilterReason: "제약조건 실습 방식에 대한 구체적 긍정 피드백" },
    { speed: "fast", comprehension: "medium", communication: 3,
      comment: "ERD의 Crow's Foot 표기법이 처음이라 1:N과 M:N 기호가 헷갈립니다. 강의자료에 기호 범례 표가 있긴 한데 수업에서 예시를 한두 개 더 그려주시면 확실히 기억될 것 같아요.",
      filteredComment: "ERD의 Crow's Foot 표기법이 처음이라 1:N과 M:N 기호가 헷갈립니다. 강의자료에 기호 범례 표가 있긴 한데 수업에서 예시를 한두 개 더 그려주시면 확실히 기억될 것 같아요.",
      commentCategory: "학습", commentFilterReason: "ERD 표기법 추가 예시 요청에 대한 구체적 건설적 요청" },
    { speed: "fast", comprehension: "low", communication: 1,
      comment: "첫 수업인데 관계형 모델·ERD·DDL·1NF를 한꺼번에 다 쑤셔넣는 건 좀 너무한 것 같습니다. 기초도 없는데 이게 무슨 수업인지 모르겠어요.",
      filteredComment: "첫 수업인데 관계형 모델·ERD·DDL·1NF까지 범위가 넓어서 따라가기 벅찼습니다. 핵심 개념에 집중해서 진행해주시면 좋겠어요.",
      commentCategory: "혼합", commentFilterReason: "수업 범위에 대한 불만, 비속어 포함", commentHasProfanity: true },
    { speed: "moderate", comprehension: "high", communication: 4,
      comment: "학생-강좌-수강 스키마를 ERD에서 CREATE TABLE까지 일관되게 사용하니 새 개념마다 새 데이터를 익힐 필요가 없어서 집중하기 좋았습니다. 앞으로도 같은 예제를 확장해주시면 좋겠어요.",
      filteredComment: "학생-강좌-수강 스키마를 ERD에서 CREATE TABLE까지 일관되게 사용하니 새 개념마다 새 데이터를 익힐 필요가 없어서 집중하기 좋았습니다. 앞으로도 같은 예제를 확장해주시면 좋겠어요.",
      commentCategory: "학습", commentFilterReason: "일관된 예제 데이터 전략에 대한 구체적 긍정 피드백" },
    // ── 2주차 (JOIN, GROUP BY·HAVING, 서브쿼리, 트랜잭션·ACID, 격리수준) ──
    { speed: "moderate", comprehension: "high", communication: 4,
      comment: "INNER JOIN과 LEFT JOIN을 같은 학생-수강 데이터로 쿼리를 두 번 실행해 결과를 나란히 보여주신 게 정말 효과적이었습니다. 왼쪽 테이블에만 있는 학생이 NULL로 채워지는 걸 눈으로 확인하니 차이가 한번에 잡혔어요.",
      filteredComment: "INNER JOIN과 LEFT JOIN을 같은 학생-수강 데이터로 쿼리를 두 번 실행해 결과를 나란히 보여주신 게 정말 효과적이었습니다. NULL이 어디서 생기는지 눈으로 확인하니 차이가 한번에 잡혔어요.",
      commentCategory: "학습", commentFilterReason: "JOIN 비교 시연에 대한 구체적 긍정 피드백" },
    { speed: "moderate", comprehension: "medium", communication: 3,
      comment: "서브쿼리 배우고 나서 JOIN이랑 언제 어떤 걸 써야 하는지 기준이 없어서 헷갈립니다. 강의자료에 'JOIN vs 서브쿼리 선택 가이드'가 있긴 한데 수업에서 사례 중심으로 한 번 더 짚어주시면 좋겠어요.",
      filteredComment: "서브쿼리 배우고 나서 JOIN이랑 언제 어떤 걸 써야 하는지 기준이 없어서 헷갈립니다. 강의자료의 'JOIN vs 서브쿼리 선택 가이드'를 수업에서 사례 중심으로 한 번 더 짚어주시면 좋겠어요.",
      commentCategory: "학습", commentFilterReason: "자료 구성에 대한 구체적 건설적 요청" },
    { speed: "moderate", comprehension: "medium", communication: 4,
      comment: "ACID 중 Atomicity, Consistency, Durability는 은행 계좌이체 예시로 바로 이해됐는데, 격리수준 4단계(READ UNCOMMITTED~SERIALIZABLE)는 각각 어떤 상황에서 쓰는지 감이 안 잡힙니다. 구체적인 시나리오 예시가 있으면 좋겠어요.",
      filteredComment: "ACID 중 Atomicity, Consistency, Durability는 은행 이체 예시로 이해됐는데, 격리수준 4단계는 각 상황에서 언제 쓰는지 감이 안 잡힙니다. 구체적인 시나리오 예시가 있으면 좋겠어요.",
      commentCategory: "학습", commentFilterReason: "격리수준 적용 시나리오 요청에 대한 구체적 건설적 요청" },
    { speed: "fast", comprehension: "medium", communication: 3,
      comment: null, filteredComment: null, commentCategory: null, commentFilterReason: null },
    { speed: "moderate", comprehension: "high", communication: 5,
      comment: "MySQL Workbench에서 직접 GROUP BY, HAVING 쿼리를 짜고 실행하는 실습이 정말 좋았습니다. HAVING이 집계 후 필터링이라는 게 슬라이드로 볼 때는 애매했는데 실행 결과를 보니 확실히 박혔어요.",
      filteredComment: "MySQL Workbench에서 직접 GROUP BY, HAVING 쿼리를 짜고 실행하는 실습이 정말 좋았습니다. HAVING이 집계 후 필터링이라는 게 실행 결과를 보니 확실히 박혔어요.",
      commentCategory: "학습", commentFilterReason: "GROUP BY/HAVING 실습 방식에 대한 구체적 긍정 피드백" },
    { speed: "fast", comprehension: "low", communication: 2,
      comment: "인덱스 설명이 진짜 개지루하게 넘어갔는데, 인덱스 없는 쿼리 vs 있는 쿼리 실행시간 비교 한 번만 보여주셔도 왜 필요한지 바로 이해할 것 같아요.",
      filteredComment: "인덱스 설명 파트가 다소 단조롭게 느껴졌습니다. 인덱스 없는 쿼리와 있는 쿼리의 실행 시간 비교 시연이 있으면 필요성이 훨씬 와닿을 것 같아요.",
      commentCategory: "혼합", commentFilterReason: "수업 방식에 대한 불만이 있으나 비속어 포함", commentHasProfanity: true },
    { speed: "moderate", comprehension: "high", communication: 4,
      comment: "SELF JOIN으로 사원-관리자 테이블에서 부서장 이름을 찾는 예시가 처음엔 낯설었는데, 같은 테이블에 별칭 두 개를 붙이는 원리가 이해되자 재귀적인 데이터 관계도 표현할 수 있다는 게 신기했습니다.",
      filteredComment: "SELF JOIN으로 사원-관리자 테이블에서 부서장 이름을 찾는 예시가 처음엔 낯설었는데, 같은 테이블에 별칭 두 개를 붙이는 원리가 이해되자 재귀적인 데이터 관계도 표현할 수 있다는 게 신기했습니다.",
      commentCategory: "학습", commentFilterReason: "SELF JOIN 개념 이해에 대한 구체적 긍정 피드백" },
    { speed: "fast", comprehension: "medium", communication: 3,
      comment: "트랜잭션 COMMIT/ROLLBACK 설명을 은행 계좌이체 예시로 해주셨는데, 실제 SQL 코드로 START TRANSACTION부터 ROLLBACK까지 실행하는 걸 보여주시면 더 실감날 것 같아요.",
      filteredComment: "트랜잭션 COMMIT/ROLLBACK 설명을 은행 계좌이체 예시로 해주셨는데, 실제 SQL 코드로 START TRANSACTION부터 ROLLBACK까지 실행하는 걸 보여주시면 더 실감날 것 같아요.",
      commentCategory: "학습", commentFilterReason: "트랜잭션 실습 시연 요청에 대한 구체적 건설적 요청" },
    { speed: "slow", comprehension: "high", communication: 5,
      comment: "Phantom Read, Non-Repeatable Read, Dirty Read 세 가지를 구분해서 설명해주시고 어떤 격리수준에서 각 현상이 발생하는지 표로 정리해주시니 격리수준 개념이 한눈에 정리됐습니다.",
      filteredComment: "Phantom Read, Non-Repeatable Read, Dirty Read 세 가지를 구분해서 설명해주시고 어떤 격리수준에서 각 현상이 발생하는지 표로 정리해주시니 격리수준 개념이 한눈에 정리됐습니다.",
      commentCategory: "학습", commentFilterReason: "격리수준·동시성 문제 정리에 대한 구체적 긍정 피드백" },
    { speed: "moderate", comprehension: "medium", communication: 3,
      comment: null, filteredComment: null, commentCategory: null, commentFilterReason: null },
    // ── 3주차 (SQL 기초: SELECT 실행 순서·GROUP BY/HAVING·JOIN·서브쿼리) ──
    { speed: "moderate", comprehension: "high", communication: 5,
      comment: "SELECT 문의 논리적 실행 순서를 FROM→WHERE→GROUP BY→HAVING→SELECT→ORDER BY 순서로 단계별로 짚어주신 덕분에, 왜 WHERE에서 집계함수를 못 쓰는지 처음으로 납득이 됐습니다. 이 개념을 이렇게 명확히 설명해주는 강의는 처음이에요.",
      filteredComment: "SELECT 문의 논리적 실행 순서를 FROM→WHERE→GROUP BY→HAVING→SELECT→ORDER BY 순서로 단계별로 짚어주신 덕분에, 왜 WHERE에서 집계함수를 못 쓰는지 처음으로 납득이 됐습니다. 이 개념을 이렇게 명확히 설명해주는 강의는 처음이에요.",
      commentCategory: "학습", commentFilterReason: "핵심 개념 이해에 대한 구체적 긍정 피드백" },
    { speed: "fast", comprehension: "medium", communication: 3,
      comment: "GROUP BY와 HAVING을 설명하실 때 속도가 갑자기 빨라져서 HAVING이 WHERE랑 어떻게 다른지 필기를 제대로 못 했습니다. 그 부분만이라도 한 번 더 짚어주시거나 예제를 한 개 더 보여주시면 확실히 정리될 것 같아요.",
      filteredComment: "GROUP BY와 HAVING을 설명하실 때 속도가 갑자기 빨라져서 HAVING이 WHERE랑 어떻게 다른지 필기를 제대로 못 했습니다. 그 부분만이라도 한 번 더 짚어주시거나 예제를 한 개 더 보여주시면 확실히 정리될 것 같아요.",
      commentCategory: "학습", commentFilterReason: "수업 속도 및 내용 구성에 대한 구체적 건설적 요청" },
    { speed: "moderate", comprehension: "high", communication: 4,
      comment: "INNER JOIN, LEFT JOIN, RIGHT JOIN을 같은 Student-Enrollment 데이터로 세 번 실행해서 결과 차이를 나란히 보여주신 방식이 정말 효과적이었습니다. NULL이 어디서 생기는지 눈으로 직접 확인하니까 바로 이해됐어요.",
      filteredComment: "INNER JOIN, LEFT JOIN, RIGHT JOIN을 같은 Student-Enrollment 데이터로 세 번 실행해서 결과 차이를 나란히 보여주신 방식이 정말 효과적이었습니다. NULL이 어디서 생기는지 눈으로 직접 확인하니까 바로 이해됐어요.",
      commentCategory: "학습", commentFilterReason: "실습 시연 방식에 대한 구체적 긍정 피드백" },
    { speed: "moderate", comprehension: "medium", communication: 3,
      comment: "서브쿼리 위치 분류(WHERE·FROM·SELECT·EXISTS)가 있는데 실습 시간에 FROM 절 인라인 뷰는 예제가 없어서 아직 어떻게 쓰는 건지 감이 안 잡힙니다. 인라인 뷰 예제 하나만 추가해주시면 좋겠어요.",
      filteredComment: "서브쿼리 위치 분류(WHERE·FROM·SELECT·EXISTS)가 있는데 실습 시간에 FROM 절 인라인 뷰는 예제가 없어서 아직 어떻게 쓰는 건지 감이 안 잡힙니다. 인라인 뷰 예제 하나만 추가해주시면 좋겠어요.",
      commentCategory: "학습", commentFilterReason: "특정 개념 예제 부족에 대한 구체적 건설적 요청" },
    { speed: "fast", comprehension: "low", communication: 2,
      comment: "BETWEEN이랑 IN이랑 LIKE 연산자를 한꺼번에 쭉 나열하고 넘어가셔서 각각 언제 써야 하는지 구분이 전혀 안 됩니다. 예제 쿼리 하나씩이라도 보여주시면서 진행해주세요.",
      filteredComment: "BETWEEN, IN, LIKE 연산자를 한꺼번에 설명하고 넘어가셔서 각각 언제 써야 하는지 구분이 어렵습니다. 예제 쿼리 하나씩 보여주시면서 진행해주시면 좋겠어요.",
      commentCategory: "학습", commentFilterReason: "WHERE 연산자 설명 속도에 대한 구체적 건설적 요청" },
    { speed: "fast", comprehension: "low", communication: 2,
      comment: "실습 과제 Q5, Q6이 ㅈ나 어려운데 힌트도 없이 그냥 내주시면 어쩌라는 건지. SELF JOIN이랑 NOT EXISTS 개념은 강의에서 스쳐지나간 수준이라 뭘 어떻게 시작해야 할지 모르겠습니다.",
      filteredComment: "실습 과제 Q5, Q6이 난이도가 높은데 힌트 없이 출제되어 어디서 시작해야 할지 막막합니다. SELF JOIN과 NOT EXISTS는 강의에서 간략히 다뤄진 수준이라, 심화 문제에는 접근 방향 힌트가 있으면 좋겠어요.",
      commentCategory: "혼합", commentFilterReason: "과제 난이도 및 지원 부족에 대한 불만, 비속어 포함", commentHasProfanity: true },
    { speed: "moderate", comprehension: "high", communication: 4,
      comment: "COUNT(*)와 COUNT(col) 차이를 NULL 포함 여부로 구분해 설명해주신 부분이 핵심을 정확히 짚어줬습니다. 작년에 다른 수업에서 헷갈렸던 부분인데 이번에 완전히 해결됐어요.",
      filteredComment: "COUNT(*)와 COUNT(col) 차이를 NULL 포함 여부로 구분해 설명해주신 부분이 핵심을 정확히 짚어줬습니다. 작년에 다른 수업에서 헷갈렸던 부분인데 이번에 완전히 해결됐어요.",
      commentCategory: "학습", commentFilterReason: "집계 함수 개념 명확화에 대한 긍정 피드백" },
    { speed: "moderate", comprehension: "medium", communication: 3,
      comment: "자주 하는 실수 Top 5 슬라이드가 있었는데, WHERE score = NULL 같은 실수를 왜 하면 안 되는지 원리 설명 없이 '그냥 IS NULL 써야 한다'고만 하셔서 납득이 안 됐습니다. NULL의 3값 논리 배경을 한 줄이라도 설명해주시면 외워지는 게 아니라 이해가 될 것 같아요.",
      filteredComment: "자주 하는 실수 Top 5 슬라이드가 있었는데, WHERE score = NULL 같은 실수를 왜 하면 안 되는지 원리 설명 없이 'IS NULL 써야 한다'고만 하셔서 납득이 안 됐습니다. NULL의 3값 논리 배경을 한 줄이라도 설명해주시면 이해가 될 것 같아요.",
      commentCategory: "학습", commentFilterReason: "개념 원리 설명 요청에 대한 구체적 건설적 피드백" },
    { speed: "moderate", comprehension: "medium", communication: 3,
      comment: null, filteredComment: null, commentCategory: null, commentFilterReason: null },
    { speed: "slow", comprehension: "high", communication: 5,
      comment: "SQL 실행 순서, WHERE 연산자, GROUP BY, JOIN, 서브쿼리를 하나의 Student-Course-Enrollment 스키마로 일관성 있게 다뤄주셔서 각 개념이 파편화되지 않고 연결되는 느낌이었습니다. 전체 흐름이 자연스러워서 집중하기 좋았어요.",
      filteredComment: "SQL 실행 순서, WHERE 연산자, GROUP BY, JOIN, 서브쿼리를 하나의 Student-Course-Enrollment 스키마로 일관성 있게 다뤄주셔서 각 개념이 파편화되지 않고 연결되는 느낌이었습니다. 전체 흐름이 자연스러워서 집중하기 좋았어요.",
      commentCategory: "학습", commentFilterReason: "강의 전체 구성에 대한 구체적 긍정 피드백" },
    // ── 4주차 (뷰·저장 프로시저: VIEW, CREATE OR REPLACE, WITH CHECK OPTION, DELIMITER, IN/OUT, IF, WHILE, CURSOR) ──
    { speed: "moderate", comprehension: "high", communication: 5,
      comment: "VIEW를 '자주 쓰는 복잡한 JOIN 쿼리에 이름표를 붙인 것'이라고 설명하고 바로 실습으로 넘어가니 개념이 한번에 잡혔습니다. WITH CHECK OPTION 예시에서 CS 학과 외 INSERT가 막히는 것도 직접 확인해보니 뷰의 무결성 역할이 실감났어요.",
      filteredComment: "VIEW를 '자주 쓰는 복잡한 JOIN 쿼리에 이름표를 붙인 것'이라고 설명하고 바로 실습으로 넘어가니 개념이 한번에 잡혔습니다. WITH CHECK OPTION 예시에서 CS 학과 외 INSERT가 막히는 것도 직접 확인해보니 뷰의 무결성 역할이 실감났어요.",
      commentCategory: "학습", commentFilterReason: "비유 및 실습 시연에 대한 구체적 긍정 피드백" },
    { speed: "fast", comprehension: "medium", communication: 3,
      comment: "저장 프로시저 문법이 DELIMITER, BEGIN~END, DECLARE 같은 새 키워드가 한꺼번에 나와서 처음엔 SQL이 아닌 다른 언어 같이 느껴졌습니다. 강의자료 기본 구조 템플릿처럼 빈 껍데기 코드를 먼저 보여주고 채워나가는 방식으로 진행해주시면 더 따라가기 좋겠어요.",
      filteredComment: "저장 프로시저 문법이 DELIMITER, BEGIN~END, DECLARE 같은 새 키워드가 한꺼번에 나와서 처음엔 SQL이 아닌 다른 언어 같이 느껴졌습니다. 기본 구조 템플릿을 먼저 보여주고 채워나가는 방식으로 진행해주시면 더 따라가기 좋겠어요.",
      commentCategory: "학습", commentFilterReason: "수업 진행 방식에 대한 구체적 건설적 요청" },
    { speed: "moderate", comprehension: "high", communication: 4,
      comment: "IN/OUT/INOUT 매개변수 방향을 CALL 후 @변수로 꺼내서 SELECT로 확인하는 실습 흐름이 명확했습니다. sp_dept_avg 예시처럼 실제 쿼리 결과를 OUT으로 받는 패턴을 직접 써보니 프로시저의 활용 방식이 구체적으로 이해됐어요.",
      filteredComment: "IN/OUT/INOUT 매개변수 방향을 CALL 후 @변수로 꺼내서 SELECT로 확인하는 실습 흐름이 명확했습니다. sp_dept_avg 예시처럼 실제 쿼리 결과를 OUT으로 받는 패턴을 직접 써보니 프로시저의 활용 방식이 구체적으로 이해됐어요.",
      commentCategory: "학습", commentFilterReason: "매개변수 방향 실습 방식에 대한 구체적 긍정 피드백" },
    { speed: "fast", comprehension: "low", communication: 2,
      comment: "DECLARE를 BEGIN 중간에 쓰면 오류 난다는 걸 직접 틀리고서야 알았습니다. 그냥 '위에 써야 한다'고 말씀하시면 왜인지 모르니까 에러 메시지 보면서 설명해주시면 더 기억에 남을 것 같아요. 오류 메시지 해석 방법도 알려주시면 좋겠어요.",
      filteredComment: "DECLARE를 BEGIN 중간에 쓰면 오류가 난다는 규칙을 직접 틀린 후에야 알게 됐습니다. 오류 메시지를 함께 보여주시면서 이유를 설명해주시면 기억에 더 오래 남을 것 같습니다. SHOW ERRORS 활용법도 같이 알려주시면 좋겠어요.",
      commentCategory: "학습", commentFilterReason: "오류 원인 설명 방식에 대한 구체적 건설적 요청" },
    { speed: "moderate", comprehension: "medium", communication: 3,
      comment: "커서 예시에서 DECLARE CONTINUE HANDLER FOR NOT FOUND 구문이 갑자기 등장했는데, 이게 없으면 어떻게 되는지 보여주신 다음에 필요성을 설명해주셨으면 훨씬 납득이 됐을 것 같아요. 지금은 '그냥 외워야 하는 패턴'처럼 느껴집니다.",
      filteredComment: "커서 예시에서 DECLARE CONTINUE HANDLER FOR NOT FOUND 구문이 갑자기 등장했는데, 이게 없으면 어떻게 되는지 먼저 보여주시면 필요성이 훨씬 납득될 것 같아요.",
      commentCategory: "학습", commentFilterReason: "개념 도입 순서에 대한 구체적 건설적 요청" },
    { speed: "fast", comprehension: "low", communication: 1,
      comment: "커서가 ㅈ나 복잡한데 언제 쓰는지도 모르겠고 실습 예제도 너무 어렵습니다. 집합 연산으로 해결 가능하면 커서 쓰지 말라고 하시면서 왜 커서를 이렇게 길게 가르치는 건지 모르겠어요.",
      filteredComment: "커서가 복잡하게 느껴지고 언제 쓰는지 파악이 어렵습니다. 집합 연산으로 해결 가능하면 커서를 쓰지 말라고 하시면서 실습 예제가 어렵게 구성되어 있어 혼란스러웠어요. 간단한 시나리오부터 단계적으로 보여주시면 좋겠습니다.",
      commentCategory: "혼합", commentFilterReason: "커서 수업 구성에 대한 불만, 비속어 포함", commentHasProfanity: true },
    { speed: "moderate", comprehension: "high", communication: 4,
      comment: "저장 함수 fn_score_to_grade를 SELECT 절에서 바로 호출하는 것을 보고, 반복적인 CASE 문을 함수 하나로 추상화할 수 있다는 게 실용적으로 느껴졌습니다. 졸업 프로젝트 DB 설계에 바로 써먹을 수 있을 것 같아요.",
      filteredComment: "저장 함수 fn_score_to_grade를 SELECT 절에서 바로 호출하는 것을 보고, 반복적인 CASE 문을 함수 하나로 추상화할 수 있다는 게 실용적으로 느껴졌습니다. 졸업 프로젝트 DB 설계에 바로 써먹을 수 있을 것 같아요.",
      commentCategory: "학습", commentFilterReason: "저장 함수 실용성에 대한 구체적 긍정 피드백" },
    { speed: "moderate", comprehension: "medium", communication: 3,
      comment: "프로시저 안에서 트랜잭션(START TRANSACTION·ROLLBACK)을 쓰는 예시가 나왔는데, SQLEXCEPTION 핸들러가 어떤 오류를 잡고 어떤 건 못 잡는지 범위를 명확하게 설명해주시면 좋겠어요. 실무에서 어떤 패턴으로 쓰는지 예시가 하나만 더 있으면 확실히 이해될 것 같습니다.",
      filteredComment: "프로시저 안에서 트랜잭션 예시가 나왔는데, SQLEXCEPTION 핸들러가 잡는 오류 범위를 명확하게 설명해주시면 좋겠어요. 실무 패턴 예시가 하나만 더 있으면 확실히 이해될 것 같습니다.",
      commentCategory: "학습", commentFilterReason: "예외 처리 범위 설명 요청에 대한 구체적 건설적 피드백" },
    { speed: "slow", comprehension: "high", communication: 5,
      comment: "뷰 → 업데이트 가능 뷰 → WITH CHECK OPTION → 저장 프로시저 → 저장 함수 → 커서 순으로 복잡도가 단계적으로 높아지는 구성이 학습 흐름에 딱 맞았습니다. 처음 보는 개념들인데 왜 필요한지 먼저 설명해주신 덕분에 부담 없이 따라갈 수 있었어요.",
      filteredComment: "뷰 → 업데이트 가능 뷰 → WITH CHECK OPTION → 저장 프로시저 → 저장 함수 → 커서 순으로 복잡도가 단계적으로 높아지는 구성이 학습 흐름에 딱 맞았습니다. 처음 보는 개념들인데 왜 필요한지 먼저 설명해주신 덕분에 부담 없이 따라갈 수 있었어요.",
      commentCategory: "학습", commentFilterReason: "강의 전체 구성 및 개념 도입 순서에 대한 구체적 긍정 피드백" },
    { speed: "moderate", comprehension: "medium", communication: 3,
      comment: null, filteredComment: null, commentCategory: null, commentFilterReason: null },
    // ── 5주차 (트리거·인덱스·EXPLAIN: BEFORE/AFTER, OLD/NEW, SIGNAL, B-Tree, 복합 인덱스, type/key/rows) ──
    { speed: "moderate", comprehension: "high", communication: 4,
      comment: "BEFORE/AFTER 트리거를 INSERT/UPDATE/DELETE 세 이벤트 조합으로 시나리오별 표로 정리해주셔서 언제 어떤 트리거를 써야 하는지 한눈에 파악됐습니다. 감사 로그 트리거 예시에서 OLD.score와 NEW.score를 직접 비교해 조건부 INSERT하는 구조가 특히 실용적이었어요.",
      filteredComment: "BEFORE/AFTER 트리거를 INSERT/UPDATE/DELETE 세 이벤트 조합으로 시나리오별 표로 정리해주셔서 언제 어떤 트리거를 써야 하는지 한눈에 파악됐습니다. 감사 로그 트리거 예시에서 OLD.score와 NEW.score를 직접 비교해 조건부 INSERT하는 구조가 특히 실용적이었어요.",
      commentCategory: "학습", commentFilterReason: "트리거 구성과 실전 예시에 대한 구체적 긍정 피드백" },
    { speed: "moderate", comprehension: "medium", communication: 3,
      comment: "BEFORE INSERT 트리거에서 SIGNAL로 오류를 발생시키는 예시는 이해했는데, SIGNAL SQLSTATE '45000'이 정확히 어떤 규격인지 설명이 없었습니다. '사용자 정의 오류 코드'라는 설명 한 줄만 있어도 암기가 아닌 이해로 접근할 수 있을 것 같아요.",
      filteredComment: "BEFORE INSERT 트리거에서 SIGNAL로 오류를 발생시키는 예시는 이해했는데, SIGNAL SQLSTATE '45000'이 정확히 어떤 규격인지 설명이 없었습니다. 사용자 정의 오류 코드라는 배경 설명이 있으면 더 이해하기 좋겠어요.",
      commentCategory: "학습", commentFilterReason: "SIGNAL 규격 배경 설명 요청에 대한 구체적 건설적 요청" },
    { speed: "slow", comprehension: "high", communication: 5,
      comment: "인덱스 없는 쿼리 0.8초 vs 인덱스 있는 쿼리 0.05초를 실시간으로 비교해주신 게 이번 학기 최고 임팩트 시연이었습니다. EXPLAIN rows 수치가 100만 vs 12만으로 차이나는 것까지 보여주시니 인덱스가 왜 필요한지 수치로 완전히 납득됐어요.",
      filteredComment: "인덱스 없는 쿼리 0.8초 vs 인덱스 있는 쿼리 0.05초를 실시간으로 비교해주신 게 이번 학기 최고 임팩트 시연이었습니다. EXPLAIN rows 수치가 100만 vs 12만으로 차이나는 것까지 보여주시니 인덱스가 왜 필요한지 수치로 완전히 납득됐어요.",
      commentCategory: "학습", commentFilterReason: "인덱스 성능 시연에 대한 구체적 긍정 피드백" },
    { speed: "fast", comprehension: "medium", communication: 3,
      comment: "EXPLAIN 결과에서 type 컬럼이 ALL인지 ref인지만 보면 되는 줄 알았는데 key_len, Extra(Using filesort, Using temporary)까지 봐야 한다는 게 실습 중에 처음 알게 됐습니다. EXPLAIN 컬럼 해석 체크리스트가 강의자료에 있으면 혼자 쿼리 튜닝할 때 참고하기 좋겠어요.",
      filteredComment: "EXPLAIN 결과에서 type 컬럼만 보면 되는 줄 알았는데 key_len, Extra까지 봐야 한다는 게 실습 중에 처음 알게 됐습니다. EXPLAIN 컬럼 해석 체크리스트가 강의자료에 있으면 혼자 쿼리 튜닝할 때 참고하기 좋겠어요.",
      commentCategory: "학습", commentFilterReason: "EXPLAIN 심화 해석 자료 요청에 대한 구체적 건설적 요청" },
    { speed: "fast", comprehension: "low", communication: 2,
      comment: "복합 인덱스 leftmost prefix 규칙이 이해가 안 됩니다. idx_dept_grade에서 grade만 WHERE에 쓰면 인덱스 안 쓴다는 건 알겠는데, 왜 선두 컬럼이 없으면 안 되는지 B-Tree 구조로 설명해주시면 납득이 될 것 같아요. 지금은 그냥 규칙으로 외우는 느낌입니다.",
      filteredComment: "복합 인덱스 leftmost prefix 규칙이 이해가 안 됩니다. 선두 컬럼이 없으면 왜 인덱스를 못 쓰는지 B-Tree 구조와 연결해서 설명해주시면 납득이 될 것 같아요.",
      commentCategory: "학습", commentFilterReason: "복합 인덱스 원리 설명 요청에 대한 구체적 건설적 요청" },
    { speed: "fast", comprehension: "low", communication: 1,
      comment: "트리거 재귀 무한루프 얘기하시면서 '설계를 잘 하면 된다'고만 하시는데 그게 ㅈ같은 답변 아닌가요. 어떻게 설계해야 재귀가 안 생기는지 패턴을 알려주셔야 이해하죠.",
      filteredComment: "트리거 재귀 무한루프 방지를 위해 '설계를 잘 하면 된다'는 설명이 추상적으로 느껴졌습니다. 재귀가 발생하지 않는 구체적인 설계 패턴 예시를 보여주시면 훨씬 도움이 될 것 같아요.",
      commentCategory: "혼합", commentFilterReason: "설명 구체성 부족에 대한 불만, 비속어 포함", commentHasProfanity: true },
    { speed: "moderate", comprehension: "high", communication: 4,
      comment: "인덱스가 사용되지 않는 패턴 표(함수 적용·앞쪽 LIKE·암묵적 형변환)가 실무에서 바로 체크리스트로 쓸 수 있을 것 같았습니다. WHERE YEAR(col)=2025 대신 BETWEEN으로 바꿨더니 EXPLAIN type이 ALL에서 range로 바뀌는 걸 직접 보니 확실히 기억에 남아요.",
      filteredComment: "인덱스가 사용되지 않는 패턴 표(함수 적용·앞쪽 LIKE·암묵적 형변환)가 실무 체크리스트로 바로 활용할 수 있어 좋았습니다. BETWEEN으로 바꿨더니 EXPLAIN type이 ALL에서 range로 바뀌는 것을 직접 확인하니 확실히 기억에 남아요.",
      commentCategory: "학습", commentFilterReason: "인덱스 미사용 패턴 실습에 대한 구체적 긍정 피드백" },
    { speed: "moderate", comprehension: "medium", communication: 3,
      comment: "ANALYZE TABLE을 언제 실행해야 하는지 기준이 모호합니다. 대량 데이터 변경 후라고 하셨는데 '대량'이 어느 정도인지, 주기적으로 자동 실행되는 건지 알고 싶어요. 실무에서 어떻게 관리하는지 간단히 설명해주시면 좋겠습니다.",
      filteredComment: "ANALYZE TABLE을 언제 실행해야 하는지 기준이 모호합니다. 대량 데이터 변경 후라는 기준이 구체적으로 어느 정도인지, 자동 실행 여부도 설명해주시면 좋겠어요.",
      commentCategory: "학습", commentFilterReason: "ANALYZE TABLE 실행 기준에 대한 구체적 건설적 요청" },
    { speed: "moderate", comprehension: "medium", communication: 3,
      comment: null, filteredComment: null, commentCategory: null, commentFilterReason: null },
    { speed: "slow", comprehension: "high", communication: 5,
      comment: "트리거로 감사 로그를 자동 기록하고, 인덱스로 조회를 빠르게 하고, EXPLAIN으로 병목을 진단하는 흐름이 '실제 운영 DB를 어떻게 관리하는가'라는 큰 그림과 연결됐습니다. 앞 주차보다 실용적인 내용이라 집중도가 높았어요.",
      filteredComment: "트리거로 감사 로그를 자동 기록하고, 인덱스로 조회를 빠르게 하고, EXPLAIN으로 병목을 진단하는 흐름이 실제 운영 DB 관리라는 큰 그림과 연결됐습니다. 앞 주차보다 실용적인 내용이라 집중도가 높았어요.",
      commentCategory: "학습", commentFilterReason: "강의 전체 구성의 실용성에 대한 구체적 긍정 피드백" },
    // ── 6주차 (NoSQL·MongoDB: 도큐먼트 모델, CRUD, 쿼리 연산자, 집계 파이프라인, $lookup, Compass) ──
    { speed: "moderate", comprehension: "high", communication: 4,
      comment: "MongoDB 도큐먼트를 JSON 형식으로 직접 보여주고 바로 insertOne/find 실습으로 넘어가니 관계형 DB와의 차이가 피부로 느껴졌습니다. 중첩 도큐먼트와 배열 구조를 보고 '왜 JOIN이 없어도 되는지' 설계 철학이 한 번에 이해됐어요.",
      filteredComment: "MongoDB 도큐먼트를 JSON 형식으로 직접 보여주고 바로 insertOne/find 실습으로 넘어가니 관계형 DB와의 차이가 피부로 느껴졌습니다. 중첩 도큐먼트와 배열 구조를 보고 '왜 JOIN이 없어도 되는지' 설계 철학이 한 번에 이해됐어요.",
      commentCategory: "학습", commentFilterReason: "도큐먼트 모델 실습 방식에 대한 구체적 긍정 피드백" },
    { speed: "moderate", comprehension: "medium", communication: 3,
      comment: "집계 파이프라인 $match·$group·$project가 SQL의 WHERE·GROUP BY·SELECT와 대응된다는 걸 강의자료 비교 표로 보여주셔서 전환이 훨씬 수월했습니다. $unwind가 배열을 펼친다는 개념은 처음엔 낯설었는데, courses 배열로 직접 실습하니까 바로 이해됐어요.",
      filteredComment: "집계 파이프라인 $match·$group·$project가 SQL의 WHERE·GROUP BY·SELECT와 대응된다는 걸 강의자료 비교 표로 보여주셔서 전환이 훨씬 수월했습니다. $unwind가 배열을 펼친다는 개념도 실습으로 바로 이해됐어요.",
      commentCategory: "학습", commentFilterReason: "SQL-파이프라인 대응 설명에 대한 구체적 긍정 피드백" },
    { speed: "fast", comprehension: "medium", communication: 3,
      comment: "$lookup을 써서 enrollments와 courses를 조인하는 실습에서, $unwind 없이 as 배열 필드에 바로 접근하려다 오류가 났습니다. $lookup → $unwind 순서가 필수라는 걸 직접 틀려보고 알게 됐는데, 이 순서를 강의 중에 한 번 더 강조해주시면 좋겠어요.",
      filteredComment: "$lookup을 써서 컬렉션을 조인하는 실습에서 $unwind 없이 배열 필드에 바로 접근하려다 오류가 났습니다. $lookup → $unwind 순서를 강의 중에 한 번 더 강조해주시면 좋겠어요.",
      commentCategory: "학습", commentFilterReason: "$lookup-$unwind 순서 오류 경험 기반 건설적 요청" },
    { speed: "slow", comprehension: "high", communication: 5,
      comment: "Compass GUI로 도큐먼트를 시각적으로 탐색하면서 실습하니 처음 접하는 NoSQL인데도 금방 익숙해졌습니다. 특히 Aggregations 탭에서 파이프라인 스테이지를 블록으로 추가하면서 각 단계 결과를 바로 확인할 수 있는 게 학습에 정말 효과적이었어요.",
      filteredComment: "Compass GUI로 도큐먼트를 시각적으로 탐색하면서 실습하니 처음 접하는 NoSQL인데도 금방 익숙해졌습니다. Aggregations 탭에서 파이프라인 스테이지별 결과를 바로 확인할 수 있어서 학습 효과가 컸어요.",
      commentCategory: "학습", commentFilterReason: "Compass 실습 방식에 대한 구체적 긍정 피드백" },
    { speed: "fast", comprehension: "low", communication: 2,
      comment: "CAP 이론에서 CP, AP, CA 구분이 너무 추상적이었습니다. MongoDB가 기본 설정으로 CP라는 게 실제로 어떤 의미인지, 네트워크 분할이 생기면 뭐가 어떻게 되는지 예시로 설명해주시면 훨씬 와닿을 것 같아요.",
      filteredComment: "CAP 이론에서 CP, AP, CA 구분이 추상적으로 느껴졌습니다. MongoDB가 기본 설정으로 CP라는 게 실제 네트워크 분할 상황에서 어떤 의미인지 예시로 설명해주시면 훨씬 와닿을 것 같아요.",
      commentCategory: "학습", commentFilterReason: "CAP 이론 추상성에 대한 구체적 건설적 요청" },
    { speed: "fast", comprehension: "low", communication: 1,
      comment: "오늘 $group 실습에서 _id에 뭘 넣어야 하는지 계속 헷갈려서 ㅈ같았습니다. GROUP BY랑 대응된다고 하셨는데 왜 _id 필드에 넣는지 이름부터가 직관적이지 않아요. 처음부터 'GROUP BY 컬럼 = _id' 이렇게 명확하게 짚어주시면 좋겠어요.",
      filteredComment: "$group의 _id 필드에 무엇을 넣어야 하는지 계속 헷갈렸습니다. GROUP BY 컬럼 = _id로 명확하게 짚어주시면 좋겠어요. 이름이 직관적이지 않아서 처음 배울 때 혼란스러웠습니다.",
      commentCategory: "혼합", commentFilterReason: "$group _id 명명 혼란에 대한 불만, 비속어 포함", commentHasProfanity: true },
    { speed: "moderate", comprehension: "high", communication: 4,
      comment: "deleteMany({})가 컬렉션 전체를 삭제한다는 경고를 강의자료에 굵게 표시해주셔서 실습 중에 한 번 더 확인하게 됐습니다. 실제로 옆 친구가 실수로 다 날렸다가 복구하느라 고생했는데, 덕분에 저는 find()로 먼저 확인하는 습관이 생겼어요.",
      filteredComment: "deleteMany({})가 컬렉션 전체를 삭제한다는 경고를 강의자료에 표시해주셔서 실습 중에 한 번 더 확인하게 됐습니다. find()로 먼저 확인하는 습관이 생겼어요.",
      commentCategory: "학습", commentFilterReason: "안전 실습 습관 형성에 대한 구체적 긍정 피드백" },
    { speed: "moderate", comprehension: "medium", communication: 3,
      comment: "전체 학기 돌아보면 SQL에서 시작해서 뷰·프로시저·트리거·인덱스까지 관계형 DB를 탄탄히 다지고 마지막에 NoSQL로 확장하는 흐름이 논리적이었습니다. 다만 MongoDB 집계 파이프라인은 한 주로 다루기엔 내용이 많아서 $lookup과 $unwind는 좀 더 실습 시간이 필요했어요.",
      filteredComment: "SQL에서 시작해서 뷰·프로시저·트리거·인덱스를 다지고 NoSQL로 확장하는 학기 흐름이 논리적이었습니다. 다만 MongoDB 집계 파이프라인은 한 주로 다루기엔 내용이 많아서 $lookup·$unwind 실습 시간이 조금 더 필요했어요.",
      commentCategory: "학습", commentFilterReason: "학기 전체 구성에 대한 긍정+건설적 균형 피드백" },
    { speed: "moderate", comprehension: "medium", communication: 3,
      comment: null, filteredComment: null, commentCategory: null, commentFilterReason: null },
    { speed: "slow", comprehension: "high", communication: 5,
      comment: "1주차에 ERD 그리던 것부터 6주차 MongoDB 파이프라인까지 같은 '학생-강좌-수강' 데이터를 계속 써줘서 새 개념을 배울 때마다 새 데이터를 익힐 필요가 없어서 학습 부담이 낮았습니다. 이런 일관된 예제 데이터 전략이 이 강의의 가장 큰 장점이에요.",
      filteredComment: "1주차에 ERD 그리던 것부터 6주차 MongoDB 파이프라인까지 같은 학생-강좌-수강 데이터를 계속 써줘서 새 개념을 배울 때마다 새 데이터를 익힐 필요가 없어서 학습 부담이 낮았습니다. 일관된 예제 데이터 전략이 이 강의의 큰 장점이에요.",
      commentCategory: "학습", commentFilterReason: "학기 전체 예제 데이터 일관성에 대한 구체적 긍정 피드백" },
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

  // 주차별 피드백 수: 1~6주차 10개(PDF 연계)
  const weekAssignments2 = [
    ...Array(10).fill(0),  // 1주차
    ...Array(10).fill(1),  // 2주차
    ...Array(10).fill(2),  // 3주차
    ...Array(10).fill(3),  // 4주차
    ...Array(10).fill(4),  // 5주차
    ...Array(10).fill(5),  // 6주차
  ];
  for (let i = 0; i < kimDetailedFeedbacks2.length; i++) {
    const roundId = kimRounds2[weekAssignments2[i]].id;
    const fb = kimDetailedFeedbacks2[i];
    await prisma.feedback.create({
      data: { courseId: kimCourse2.id, roundId, ...fb, interest: rand5(), assignment: rand5() },
    });
  }
  totalFeedbacks += kimDetailedFeedbacks2.length;
  courseResults.push({ name: "데이터베이스", semester: "2026-1", category: "컴퓨터과학", prof: "김민수", count: kimDetailedFeedbacks2.length });

  // 데이터베이스 강의자료 등록 (1~6주차 PDF)
  await prisma.lectureMaterial.createMany({
    data: [
      { courseId: kimCourse2.id, fileName: "데이터베이스_1주차_강의자료.pdf", filePath: "데이터베이스_1주차_강의자료.pdf" },
      { courseId: kimCourse2.id, fileName: "데이터베이스_2주차_강의자료.pdf", filePath: "데이터베이스_2주차_강의자료.pdf" },
      { courseId: kimCourse2.id, fileName: "데이터베이스_3주차_강의자료.pdf", filePath: "데이터베이스_3주차_강의자료.pdf" },
      { courseId: kimCourse2.id, fileName: "데이터베이스_4주차_강의자료.pdf", filePath: "데이터베이스_4주차_강의자료.pdf" },
      { courseId: kimCourse2.id, fileName: "데이터베이스_5주차_강의자료.pdf", filePath: "데이터베이스_5주차_강의자료.pdf" },
      { courseId: kimCourse2.id, fileName: "데이터베이스_6주차_강의자료.pdf", filePath: "데이터베이스_6주차_강의자료.pdf" },
    ],
  });

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
