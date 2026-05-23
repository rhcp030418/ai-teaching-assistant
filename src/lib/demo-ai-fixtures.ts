import type { ClassChecklist } from "@/app/actions/class-checklist";
import type { CauseAnalysisResult } from "@/app/actions/cause-analysis";
import type { ImprovementCase, MyCurrentStats } from "@/app/actions/improvement-cases";
import type { ImprovementRoadmapData } from "@/app/actions/improvement-roadmap";
import type { MaterialAnalysis } from "@/app/actions/analyze-material";
import type { TrendNarrative } from "@/app/actions/trend-analysis";

export const DEMO_TREND_NARRATIVE: TrendNarrative = {
  trend: "improving",
  narrative:
    "3주차에서 6주차 사이 내용 이해 높음 비율이 48%에서 71%로 상승했고, 질문·소통 편의도 3.7점에서 4.4점으로 안정적으로 개선되었습니다. 다만 최근 구간에서는 속도 적절 응답이 소폭 둔화되어, 다음 회차에서는 새 개념 도입 전 예시를 먼저 제시하는 흐름을 유지하는 것이 좋습니다.",
  predicted: {
    comprehension: 74,
    communication: 90,
    speed: 72,
  },
};

export const DEMO_COMMENT_SUMMARY =
  "학생들은 실습 예시가 늘어난 점과 질의응답 시간이 확보된 점을 긍정적으로 보고 있습니다. 다만 일부 학생은 과제 안내와 새 용어 설명이 조금 더 구조화되면 수업 흐름을 따라가기 쉽겠다고 남겼습니다.";

export const DEMO_CAUSE_ANALYSIS: CauseAnalysisResult = {
  causes: [
    {
      axis: "내용 이해",
      observation:
        "최근 라운드에서 내용 이해 높음 비율은 71%로 양호하지만, 의견 중 새 용어를 처음 접할 때 흐름이 빨라진다는 언급이 반복됩니다.",
      possibleCause:
        "학생들은 전체 설명보다 용어가 처음 등장하는 구간에서 부담을 느끼는 것으로 보입니다. 강의자료 분석에서도 정규화, 인덱스, 트랜잭션 같은 핵심 용어가 한 슬라이드에 밀집된 구간이 확인됩니다.",
      materialEvidence:
        "6주차 강의자료의 용어 밀도는 '중상'으로 분석되었고, 핵심 개념 4개가 연속 슬라이드에 배치되어 있습니다.",
    },
    {
      axis: "수업 속도",
      observation:
        "속도 적절 응답은 68%로 기준선은 넘지만, 직전 주차 대비 4%p 낮아졌습니다.",
      possibleCause:
        "실습 설명 직후 과제 안내로 넘어가는 구간에서 학생들이 정리할 시간을 충분히 갖지 못했을 가능성이 있습니다.",
      materialEvidence:
        "실습 예시는 충분하지만, 실습 후 체크 질문이나 정리 슬라이드는 상대적으로 적게 배치되어 있습니다.",
    },
  ],
  actionItems: [
    "다음 수업에서 새 용어가 처음 등장하는 슬라이드마다 30초 요약 박스를 추가하고, 용어 정의보다 간단한 사용 예시를 먼저 보여주세요.",
    "실습 직후 2분 동안 핵심 쿼리 한 줄을 학생이 직접 설명하게 한 뒤 과제 안내로 넘어가면 속도 부담을 줄일 수 있습니다.",
  ],
};

export const DEMO_IMPROVEMENT_ROADMAP: ImprovementRoadmapData = {
  summary:
    "현재 강의는 질문·소통 편의와 실습 반응이 안정적으로 상승하고 있습니다. 다음 회차에서는 새 용어가 몰리는 구간을 더 잘게 나누고, 실습 후 정리 시간을 확보하는 것이 학생 이해 흐름을 유지하는 데 도움이 됩니다.",
  weeklyGoal:
    "다음 회차에서는 핵심 용어 도입 구간의 내용 이해 높음 비율을 71%에서 75% 이상으로 끌어올리는 것을 목표로 합니다.",
  priorities: [
    {
      rank: 1,
      area: "내용 이해",
      problem:
        "이해도는 개선되고 있지만, 새 용어가 연속으로 등장하는 구간에서 학생들이 흐름을 놓친다는 의견이 있습니다.",
      action:
        "다음 수업 전에 핵심 용어 4개를 '정의 → 예시 → 짧은 확인 질문' 순서로 나누어 배치하세요. 각 용어 설명 뒤에는 1문장 확인 질문을 넣어 학생이 스스로 설명하게 합니다.",
      evidence:
        "최근 의견에서 '용어가 한 번에 많이 나왔다', '예시가 있으면 더 좋겠다'는 표현이 반복되었습니다.",
      impact: "high",
    },
    {
      rank: 2,
      area: "수업 속도",
      problem:
        "속도 적절 응답이 기준선은 넘지만 직전 주차보다 소폭 낮아져, 실습 후 전환 구간에서 부담이 생길 수 있습니다.",
      action:
        "실습이 끝난 뒤 바로 다음 개념으로 넘어가지 말고, 2분 동안 학생이 작성한 쿼리의 의도를 짝과 설명하게 한 뒤 마무리 요약을 제시하세요.",
      evidence:
        "최근 라운드에서 속도 적절 응답은 68%로, 직전 주차 대비 4%p 낮아졌습니다.",
      impact: "medium",
    },
  ],
};

export const DEMO_CLASS_CHECKLIST: ClassChecklist = {
  roundLabel: "6주차",
  items: [
    {
      priority: "urgent",
      category: "content",
      action:
        "다음 수업 전에 새 용어 4개를 한 장에 몰아두지 말고, 각 용어마다 예시 쿼리 1개와 확인 질문 1개를 붙여 준비하세요.",
      reason:
        "이해도는 상승했지만 새 용어가 빠르게 이어진다는 의견이 반복되어, 용어 도입 구간의 부담을 낮추는 것이 우선입니다.",
    },
    {
      priority: "important",
      category: "pace",
      action:
        "실습 설명 뒤에는 2분 정리 시간을 고정으로 두고, 학생이 작성한 쿼리의 목적을 한 문장으로 설명하게 하세요.",
      reason:
        "속도 적절 응답이 직전 주차보다 소폭 낮아졌고, 실습 후 다음 내용으로 넘어가는 구간에서 부담이 생길 수 있습니다.",
    },
    {
      priority: "optional",
      category: "material",
      action:
        "강의자료 마지막에 오늘 배운 SQL 패턴 3개를 한 화면 요약으로 추가하세요.",
      reason:
        "학생들이 수업 후 복습할 때 핵심 패턴을 빠르게 찾을 수 있어 자료 활용성이 높아집니다.",
    },
  ],
  encouragement:
    "질문·소통 편의와 실습 반응은 안정적으로 좋아지고 있어, 현재의 질의응답 흐름은 유지해도 좋습니다.",
};

export const DEMO_CASE_INSIGHT =
  "이 사례의 핵심은 새 개념 설명 전에 짧은 예시를 먼저 제시하고, 수업 중간에 학생이 직접 설명하는 시간을 넣었다는 점입니다. 현재 강의도 이해도와 소통은 상승하고 있으므로, 다음 회차에서는 트랜잭션 개념 설명 직후 2분짜리 짝 설명 활동을 넣어보시면 좋겠습니다.";

export const DEMO_IMPROVEMENT_CASES: ImprovementCase[] = [
  {
    label: "익명 교수 A",
    beforeSemester: "2025-2",
    afterSemester: "2026-1",
    beforeAvg: 3.8,
    afterAvg: 4.5,
    change: 0.7,
    primaryAxis: "comprehension",
    aiInsight: DEMO_CASE_INSIGHT,
    changes: {
      speedModerate: { before: 58, after: 74 },
      comprehensionHigh: { before: 46, after: 76 },
    },
    notes: [
      {
        sameCategory: true,
        note: "이론 설명 전에 짧은 SQL 예시를 먼저 보여주고, 학생이 결과를 예측하게 했습니다.",
      },
      {
        sameCategory: true,
        note: "수업 중반에 3분짜리 개념 확인 질문을 넣어 이해가 흔들리는 지점을 바로 확인했습니다.",
      },
    ],
  },
  {
    label: "익명 교수 B",
    beforeSemester: "2025-2",
    afterSemester: "2026-1",
    beforeAvg: 3.9,
    afterAvg: 4.4,
    change: 0.5,
    primaryAxis: "speed",
    aiInsight: null,
    changes: {
      speedModerate: { before: 49, after: 72 },
      comprehensionHigh: { before: 55, after: 69 },
    },
    notes: [
      {
        sameCategory: false,
        note: "새 단원으로 넘어가기 전에 지난 개념을 1분 요약하고 질문을 받았습니다.",
      },
    ],
  },
];

export const DEMO_MY_STATS: MyCurrentStats = {
  communicationAvg: 4.4,
  speedModerateRatio: 68,
  comprehensionHighRatio: 71,
};

export const DEMO_MATERIAL_ANALYSIS: MaterialAnalysis = {
  summary:
    "이 자료는 데이터베이스 트랜잭션의 개념, ACID 속성, 동시성 제어, 인덱스 활용 흐름을 다룹니다. 핵심 개념은 충실하지만 전문 용어가 연속적으로 등장해 처음 접하는 학생에게는 중간 정리 지점이 필요합니다.",
  difficulty: "중",
  difficultyReason:
    "트랜잭션, 격리 수준, 인덱스 같은 개념이 한 회차에 함께 등장합니다. 최근 피드백에서 이해도는 높아졌지만 새 용어 부담이 언급되어 난이도는 중간 이상으로 판단됩니다.",
  termDensity: "높음",
  termExamples: ["트랜잭션", "ACID", "격리 수준", "인덱스", "정규화"],
  exampleSufficiency: "보통",
  exampleFeedback:
    "SQL 예시는 포함되어 있으나 각 개념별로 결과를 예측하거나 비교하는 예시는 더 보강할 수 있습니다.",
  improvements: {
    structure:
      "ACID 속성을 한 번에 설명하기보다 속성별 짧은 사례를 먼저 제시한 뒤 정의를 연결하세요.",
    examples:
      "인덱스 적용 전후 쿼리 실행 계획을 비교하는 예시를 1개 추가하면 학생이 효용을 더 쉽게 이해할 수 있습니다.",
    pedagogy:
      "핵심 개념 설명 후 1문장 확인 질문을 넣어 학생이 직접 설명하게 하는 인출 연습을 적용하세요.",
  },
};

export const DEMO_CHAT_MESSAGES = [
  {
    role: "user" as const,
    content: "이번 주차에서 학생들이 가장 어려워한 부분이 뭐야?",
  },
  {
    role: "assistant" as const,
    content:
      "이번 주차에서는 트랜잭션과 인덱스 관련 용어가 연속적으로 등장한 구간에서 부담이 컸던 것으로 보입니다. 다만 실습 예시와 질의응답에 대한 반응은 긍정적이어서, 다음 회차에는 새 용어를 예시 중심으로 나누어 설명하면 현재 상승 흐름을 유지할 수 있습니다.",
  },
];
