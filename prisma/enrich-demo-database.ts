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

const roundCommentPools: Record<number, { positive: string[]; difficulty: string[] }> = {
  1: {
    positive: [
      "ERD를 그릴 때 학생-강좌-수강 예시를 계속 사용해서 처음 구조를 잡는 데 도움이 됐습니다.",
      "개념을 바로 문제로 연결하기 전에 용어를 한 번 정리해주신 부분이 좋았습니다.",
      "데이터베이스가 왜 필요한지 실제 서비스 예시로 시작해서 수업 목적이 분명했습니다.",
      "관계와 테이블을 그림으로 같이 설명해주셔서 추상적인 내용이 덜 부담스러웠습니다.",
    ],
    difficulty: [
      "기본키와 외래키 용어가 처음부터 많이 나와서 한 장짜리 용어 정리표가 있으면 좋겠습니다.",
      "ERD 기호가 낯설어서 예시를 따라 그리는 시간이 조금 더 필요했습니다.",
      "개체와 관계를 구분하는 기준이 아직 헷갈려서 짧은 퀴즈가 있으면 도움이 될 것 같습니다.",
      "초반 개념은 이해했지만 과제에서 어디까지 표현해야 하는지 기준이 더 분명하면 좋겠습니다.",
    ],
  },
  2: {
    positive: [
      "관계형 모델을 실제 테이블로 바꾸는 과정을 순서대로 보여주셔서 흐름이 잡혔습니다.",
      "정규화 전후 테이블을 비교한 예시가 이해에 도움이 됐습니다.",
      "수업 중간에 질문을 받아주셔서 놓친 부분을 바로 확인할 수 있었습니다.",
      "같은 예제 데이터가 계속 이어져서 새 개념을 배울 때 진입 장벽이 낮았습니다.",
    ],
    difficulty: [
      "함수 종속과 정규형의 차이를 한 번에 이해하기 어려워서 단계별 예시가 더 있으면 좋겠습니다.",
      "정규화 판단 기준을 과제에 적용할 때 어느 수준까지 나눠야 하는지 헷갈렸습니다.",
      "용어 설명은 이해됐지만 실제 테이블로 바꾸는 연습 시간이 조금 부족했습니다.",
      "수업 속도가 중간 이후 조금 빨라져서 마지막 예시는 복습 자료로 다시 보고 싶습니다.",
    ],
  },
  3: {
    positive: [
      "SQL SELECT 예시를 직접 실행 결과와 함께 보여주셔서 문법이 기억에 남았습니다.",
      "JOIN을 그림과 테이블 결과로 같이 설명해주신 부분이 좋았습니다.",
      "서브쿼리와 JOIN을 비교한 표가 있어서 어떤 상황에 쓰는지 감이 왔습니다.",
      "실습 시간이 충분해서 바로 따라 해보며 이해할 수 있었습니다.",
    ],
    difficulty: [
      "JOIN 종류가 많아서 INNER JOIN과 OUTER JOIN 차이를 더 많은 사례로 보고 싶습니다.",
      "서브쿼리 실행 순서가 아직 헷갈려서 단계별 실행 과정을 다시 설명해주시면 좋겠습니다.",
      "실습 환경 설정에서 막힌 시간이 있어 다음에는 시작 전에 체크리스트가 있으면 좋겠습니다.",
      "WHERE와 HAVING을 구분하는 기준을 과제 예시와 연결해서 한 번 더 보고 싶습니다.",
    ],
  },
  4: {
    positive: [
      "정규화 실습에서 잘못된 설계와 수정된 설계를 비교해주셔서 이해가 확실해졌습니다.",
      "직접 테이블을 나누고 다시 합쳐보는 흐름이 개념 정리에 도움이 됐습니다.",
      "복습 퀴즈가 있어 지난 시간 내용과 자연스럽게 연결됐습니다.",
      "과제 예시 답안의 범위를 보여주셔서 제출 기준을 파악하기 쉬웠습니다.",
    ],
    difficulty: [
      "대체키와 후보키를 구분하는 부분은 아직 조금 헷갈려 추가 예시가 있으면 좋겠습니다.",
      "정규화가 너무 잘게 쪼개지는 경우와 적절한 경우의 경계가 궁금합니다.",
      "실습은 좋았지만 결과를 스스로 점검할 수 있는 체크 포인트가 더 있으면 좋겠습니다.",
      "수업 내용은 이해됐지만 과제 채점 기준이 더 구체적으로 보이면 안심될 것 같습니다.",
    ],
  },
  5: {
    positive: [
      "EXPLAIN 결과를 인덱스 적용 전후로 비교한 부분이 가장 도움이 됐습니다.",
      "성능이 왜 달라지는지 숫자로 확인해서 인덱스 필요성이 분명해졌습니다.",
      "트리거와 감사 로그 예시가 실제 서비스 운영과 연결되어 흥미로웠습니다.",
      "실습에서 직접 쿼리 시간을 비교하니 이론보다 훨씬 잘 이해됐습니다.",
    ],
    difficulty: [
      "인덱스 종류와 선택 기준이 많아서 요약표가 있으면 복습하기 좋겠습니다.",
      "EXPLAIN 결과의 어떤 열을 먼저 봐야 하는지 판단 순서를 더 알고 싶습니다.",
      "트리거 문법은 한 번에 따라가기 어려워서 완성 코드와 빈칸 코드가 함께 있으면 좋겠습니다.",
      "과제에서 성능 분석을 어디까지 써야 하는지 예시 답안 범위가 필요합니다.",
    ],
  },
  6: {
    positive: [
      "MongoDB 문서를 JSON으로 직접 보니 관계형 DB와 차이가 확실히 느껴졌습니다.",
      "SQL과 NoSQL을 같은 데이터로 비교해서 새 개념을 연결하기 좋았습니다.",
      "Compass 화면에서 파이프라인 단계를 바로 확인할 수 있어 실습 몰입도가 높았습니다.",
      "한 학기 흐름을 관계형에서 NoSQL로 확장하는 방식이 자연스러웠습니다.",
    ],
    difficulty: [
      "$lookup과 $unwind 순서가 헷갈려서 단계별 중간 결과를 더 자주 확인하고 싶습니다.",
      "CAP 이론은 추상적이라 실제 장애 상황 예시가 있으면 더 와닿을 것 같습니다.",
      "집계 파이프라인은 한 주에 다루기엔 내용이 많아서 복습용 실습 파일이 필요합니다.",
      "MongoDB와 SQL의 장단점을 시험이나 과제 기준으로 어떻게 정리해야 할지 궁금합니다.",
    ],
  },
};

const additionalFeedbackTemplates = [
  "학기 전체적으로 같은 예제 데이터를 이어서 사용한 점이 가장 좋았습니다. 새 개념을 배울 때마다 처음부터 다시 익히지 않아도 되어 부담이 줄었습니다.",
  "강의자료는 도움이 됐지만 과제 안내 문서는 제출 예시와 감점 기준이 더 구체적으로 들어가면 좋겠습니다.",
  "수업 중 질문 시간이 조금 더 앞부분에도 있으면 좋겠습니다. 마지막에 몰아서 질문하려니 중간에 헷갈린 내용을 잊어버릴 때가 있습니다.",
  "실습 중심 회차는 이해가 잘 됐고, 이론 중심 회차는 용어 정리표가 있으면 복습하기 훨씬 편할 것 같습니다.",
  "데이터베이스 설계부터 MongoDB까지 이어지는 흐름은 좋았습니다. 다만 마지막 단원은 실습 시간이 조금 더 필요했습니다.",
  "추가 자료로 SQL과 NoSQL 명령어를 나란히 비교한 표가 있으면 시험 준비와 복습에 도움이 될 것 같습니다.",
  "과제 피드백이 빨리 올라오는 주차에는 다음 과제를 준비하기 쉬웠습니다. 가능하면 좋은 예시 답안도 함께 공유되면 좋겠습니다.",
  "전체적으로 실무 예시가 많아서 흥미로웠습니다. 어려운 용어는 처음 나올 때 한 줄 정의를 더 강조해주시면 좋겠습니다.",
];

function scoreFromAverage(avg: number, index: number) {
  const low = Math.floor(avg);
  const high = Math.ceil(avg);
  if (low === high) return Math.min(5, Math.max(1, low));
  const highRatio = avg - low;
  return index % 10 < Math.round(highRatio * 10) ? high : low;
}

function demoFeedbackForRound(week: number, index: number, total: number) {
  const profile = roundProfiles[week] ?? roundProfiles[6];
  const commentPool = roundCommentPools[week] ?? roundCommentPools[6];
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
  const positiveComment = index % 5 !== 1
    ? commentPool.positive[(index + week) % commentPool.positive.length]
    : null;
  const difficultyComment = index % 4 !== 2
    ? commentPool.difficulty[(index + Math.floor(index / 2)) % commentPool.difficulty.length]
    : null;
  const comment = [positiveComment && `좋았던 점: ${positiveComment}`, difficultyComment && `어려웠던 점: ${difficultyComment}`]
    .filter(Boolean)
    .join("\n\n") || (index % 2 === 0 ? profile.positive : profile.difficulty);

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

// 주차별 강의 주제에 맞춘 서로 다른 개선 제안 (검증된 교수법 기법명 포함).
// 카드에서 기본 펼침으로 보이므로 한 줄로 짧고 구체적으로 작성한다.
const weekImprovements: Record<number, { structure: string; examples: string; pedagogy: string }> = {
  1: {
    structure: "데이터베이스가 왜 필요한지 실제 서비스 사례로 도입한 뒤 ERD 전체 구조를 한 장으로 먼저 보여주면 세부 용어를 걸어 둘 틀이 생깁니다 (사전 안내자/advance organizer).",
    examples: "기본키·외래키 같은 핵심 용어를 한 장짜리 정의표로 정리해 ERD 예시와 나란히 배치하세요 (이중 부호화/dual coding).",
    pedagogy: "개체와 관계를 구분하는 짧은 객관식 질문을 중간에 던져 학생이 헷갈리는 지점을 즉석에서 드러내게 하세요 (개념점검질문/ConcepTest).",
  },
  2: {
    structure: "관계형 모델을 테이블로 바꾸는 과정을 단계별로 끊고, 각 단계마다 중간 결과 테이블을 보여주세요 (청킹/chunking).",
    examples: "정규화 전후 테이블을 같은 데이터로 비교한 예시를 함수 종속 설명 직후에 붙이면 정규형 차이가 분명해집니다 (구체적 예시 우선/concrete examples).",
    pedagogy: "정규형 단계마다 '왜 더 쪼개야 하는가'를 학생이 직접 답하게 해 판단 기준을 스스로 세우게 하세요 (정교화 질문/elaboration).",
  },
  3: {
    structure: "JOIN과 서브쿼리를 한 슬라이드에 몰지 말고 SELECT→WHERE→JOIN→서브쿼리 순으로 끊어 각 단위 끝에 실행 결과를 확인하세요 (청킹/chunking).",
    examples: "INNER JOIN과 OUTER JOIN 차이를 같은 테이블에 적용한 결과 비교 예시로 보여주면 어떤 상황에 쓰는지 감이 잡힙니다 (구체적 예시 우선/concrete examples).",
    pedagogy: "쿼리를 실행하기 전에 결과가 어떻게 나올지 학생이 먼저 예측하게 한 뒤 실행하세요 (생성·예측 효과/generation).",
  },
  4: {
    structure: "잘못된 설계와 수정된 설계를 나란히 놓고 차이를 짚는 순서로 구성하면 정규화의 효용이 한눈에 드러납니다 (오개념 직면/confronting misconceptions).",
    examples: "과제 예시 답안의 범위와 좋은 결과물 기준을 과제 안내 시점에 함께 제시하세요 (채점 기준 사전 공유/success criteria).",
    pedagogy: "함께 풀기→일부만 비워 풀기→혼자 풀기 순으로 정규화 실습 난이도를 단계화하세요 (점진적 책임 이양/scaffolding).",
  },
  5: {
    structure: "인덱스 종류와 선택 기준을 수업 말미에 한 장 요약표로 정리해 복습 포인트를 잡게 하세요 (이중 부호화/dual coding).",
    examples: "EXPLAIN 결과를 인덱스 적용 전후로 직접 비교하는 실습을 1개 더 넣어 성능 차이를 숫자로 확인하게 하세요 (워크드 예제/worked example).",
    pedagogy: "트리거 코드는 완성본을 먼저 시연한 뒤 빈칸 코드를 채우게 하는 순서로 진행하세요 (점진적 책임 이양/scaffolding).",
  },
  6: {
    structure: "집계 파이프라인은 $match→$lookup→$unwind 단계마다 중간 결과 문서를 보여주며 끊어 진행하세요 (청킹/chunking).",
    examples: "같은 데이터를 SQL과 MongoDB로 나란히 표현한 비교 예시로 새 개념을 기존 관계형 지식에 연결하세요 (구체적 예시 우선/concrete examples).",
    pedagogy: "CAP 이론은 실제 장애 상황 시나리오를 먼저 던지고 학생이 트레이드오프를 추론하게 한 뒤 정리하세요 (생산적 실패/productive failure).",
  },
};

function materialAnalysis(week: number) {
  return JSON.stringify({
    difficulty: week >= 5 ? "보통~높음" : "보통",
    difficultyReason:
      week >= 5
        ? "인덱스, 트리거, 집계 파이프라인처럼 절차와 원리를 함께 이해해야 하는 내용이 포함되어 있습니다."
        : "핵심 개념은 명확하지만 처음 접하는 용어가 있어 예시와 표가 함께 제시될 때 이해가 쉽습니다.",
    termDensity: week >= 5 ? "높음" : "중간",
    exampleSufficiency: week >= 4 ? "충분" : "보완 필요",
    improvements: weekImprovements[week] ?? weekImprovements[6],
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

  await prisma.feedback.deleteMany({
    where: { courseId: course.id, roundId: null, commentCategory: "추가" },
  });
  await prisma.feedback.createMany({
    data: additionalFeedbackTemplates.map((comment, index) => ({
      courseId: course.id,
      roundId: null,
      speed: "moderate",
      comprehension: "3",
      materialHelp: null,
      communication: 3 + (index % 3),
      interest: null,
      assignment: null,
      practice: null,
      positiveComment: null,
      difficultyComment: null,
      activityPoints: 1,
      comment,
      filteredComment: comment,
      commentCategory: "추가",
      commentFilterReason: "추가 피드백 링크로 제출된 강의 전반 의견",
    })),
  });
  const additionalTokens = await prisma.feedbackToken.findMany({
    where: { courseId: course.id },
    orderBy: { createdAt: "asc" },
    take: additionalFeedbackTemplates.length,
    select: { id: true },
  });
  for (const token of additionalTokens) {
    await prisma.feedbackToken.update({
      where: { id: token.id },
      data: { used: true },
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
