# 강의평가 항목 개편 — 작업 로그 (FEEDBACK_FORM_REDESIGN_LOG)

구현 기준 문서는 `FEEDBACK_FORM_REDESIGN_PLAN.md`.
`Codex_feedback.md` / `gemini_feedback.md`는 과거 교차검증 참고용이며 구현 기준 아님.

## 기록 규칙
각 Phase 종료 시: Phase / Status / 변경 파일 / 작업 요약 / 검증 결과 / 남은 의사결정 / Gemini·Codex 리뷰 반영 여부.

## F0 — 감사 및 항목 확정

Status: 계획서 작성 완료, **사용자 승인 대기**

- 영향 범위 감사 완료(현재 폼 7항목, DB 6필드, 통계/차트/AI 6종/데모 데이터). 상세는 PLAN §2.
- 권장안: PLAN §3-A (코어 4축 1~5 + 속도 방향 + 조건부 2축), 마이그레이션 (가) 클린 리셋.
- 핵심 발견: ① 척도 불일치(범주형 vs 1~5) ② `analyze-material`에 무관 지표 혼입 ③ 흥미도 평가성 톤.
- 코드 변경: 없음(F0는 계획만).

### 남은 의사결정 (PLAN §10)
1. 항목 세트(3-A/3-B/3-C) 2. 흥미도 처리 3. "자료 도움" 신규 4. 속도 레이더 분리 5. 자유 의견 단일/분리 6. 마이그레이션 전략 7. 정적 preview 선작성 여부

## F1 — 스키마/마이그레이션/통계 시그니처
Status: Complete

- 변경 파일:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260523193000_feedback_form_redesign/migration.sql`
  - `src/generated/prisma/**` (Prisma generate)
  - `src/lib/feedback-stats.ts`
- 작업 요약:
  - `Feedback`에 `materialHelp`, `positiveComment`, `difficultyComment`, `activityPoints` 추가.
  - `comprehension`은 배포 안정성을 위해 물리 타입은 `String` 유지, 새 제출은 1~5 문자열로 저장. 기존 `high/medium/low`도 통계 헬퍼에서 계속 해석 가능.
  - 속도는 5단계 문자열(`very_slow/slow/moderate/fast/very_fast`) 지원. 기존 `slow/fast`도 계속 해석 가능.
  - 통계 헬퍼가 고정 4축과 새 자료·예시 도움 지표를 계산하도록 확장.
  - Railway `migrate deploy`용 migration SQL에 기존 데이터 백필 포함.

## F0.5 — 정적 Preview 초안

Status: Draft, **Gemini 검수 대기**

- 생성/수정 파일: `FEEDBACK_FORM_REDESIGN_PREVIEW.html`
- 앱 코드 변경: 없음
- 반영된 합의:
  - 핵심 지표 4축 고정: 내용 이해 / 자료·예시 도움 / 질문·소통 편의 / 학습 몰입
  - 수업 속도는 레이더 밖에서 5단계 방향 지표로 분리: 많이 느림 / 조금 느림 / 적당 / 조금 빠름 / 많이 빠름
  - 선택 항목은 과제와 실습을 별도 카드로 분리
  - 자유 의견은 좋았던 점 / 어려웠던 점 또는 더 설명이 필요한 점 2필드
  - 익명성 안내, 비교과 포인트 최대 3P, 주관식 표현 확인 안내 포함
- Codex 검토 의견:
  - 핵심 지표는 더 늘리지 않는 쪽을 권장. 추가 지표는 학생 부담과 교수 화면 복잡도를 키우므로 과제/실습/속도처럼 보조 카드로 분리하는 방식이 더 안정적.
  - 비교과 포인트는 참여율 개선에 도움이 되지만, 의견의 긍정/부정 내용이 아니라 "제출/성실 작성 여부"만 기준으로 해야 함.
  - 주관식 차단은 LLM 또는 moderation 계층으로 처리하되, 차단 사유를 학생에게 명확히 보여줘야 함.
- Gemini 검수 반영:
  - 속도 5단계, 과제/실습 분리, 핵심 4축 유지 승인.
  - 비교과 포인트는 품질 평가가 아닌 최소 길이/작성 여부 기준으로 표현 보완.
  - 주관식 표현 검토는 제출 실패보다 입력 중/제출 전 지원 안내가 더 적절하다는 방향 반영.

## F2 — 학생 폼 + 제출 액션
Status: Complete

- 변경 파일:
  - `src/app/feedback/[courseId]/feedback-form.tsx`
  - `src/app/feedback/[courseId]/page.tsx`
  - `src/app/actions/feedback.ts`
- 작업 요약:
  - 학생 폼을 고정 4축, 속도 5단계, 과제/실습 조건부 카드, 2개 주관식 필드 구조로 변경.
  - 비교과 포인트 예상 표시 추가: 제출 1P + 각 주관식 10자 이상 1P, 최대 3P.
  - 주관식 표현은 입력 중 rule-based 안내, 제출 시 서버에서 재검사.
  - 하위호환을 위해 2개 주관식 필드를 기존 `comment`에도 통합 저장.

## F3 — 대시보드 집계/차트
Status: Partial complete

- 변경 파일:
  - `src/app/dashboard/course/[courseId]/page.tsx`
  - `src/app/dashboard/course/[courseId]/feedback-analysis.tsx`
  - `src/app/actions/round-reports.ts`
  - `src/app/actions/class-checklist.ts`
  - `src/app/dashboard/course/[courseId]/materials/page.tsx`
- 작업 요약:
  - 현황 요약 레이더를 고정 4축으로 변경.
  - KPI/세부 분포 라벨을 새 지표명으로 조정.
  - 자료 분석 화면은 `materialHelp`를 우선 사용하고, 구데이터는 `practice`로 fallback.
  - 라운드 리포트/체크리스트의 이해도 계산이 새 1~5 문자열과 legacy 값을 모두 처리하도록 수정.
  - 더 깊은 AI 프롬프트 문구 전체 개편은 F4로 남김.

## F4 — AI 프롬프트 6종 + fixtures
Status: Partial complete

- 변경 파일:
  - `src/app/actions/analyze-material.ts`
- 작업 요약:
  - 강의자료 분석 컨텍스트에서 소통/흥미/과제처럼 자료와 직접 관련이 약한 신호를 제외.
  - 자료 관련 신호는 내용 이해, 자료·예시 도움, 실습·예시 fallback, 수업 속도 방향, 학생 의견으로 제한.
  - 로드맵/원인분석/체크리스트 문구 전체 개편은 영상 제출 후 추가 polish 대상으로 남김.

## F5 — 데모 데이터 재생성 + 구컬럼 제거
Status: Demo backfill complete

- 로컬 `dev.db` 기존 피드백 734건 백필 완료.
- `prisma/feedback-redesign-backfill.ts` 추가: 기존 피드백을 새 설문 구조에 맞춰 `comprehension` 1~5, `materialHelp`, `positiveComment`, `difficultyComment`, `activityPoints`로 보정.
- `prisma/seed.ts`, `prisma/seed-prod.ts`, `prisma/enrich-demo-database.ts`에서 공통 백필을 호출하도록 연결.
- Railway 시작 명령의 `npx tsx prisma/seed-prod.ts` 경로에서도 기존 DB/빈 DB seed 이후 새 필드 보정이 자동 실행됨.
- 로컬 검증: `npx tsx prisma/seed-prod.ts` 실행 결과 734건 확인, 136건 추가 보정.
- 구컬럼 제거는 영상 제출 전 리스크가 커서 진행하지 않음.

## F6 — 통합 검증 + 마감
Status: Build verified after seed backfill

- `npm run lint` 통과
- `npx tsc --noEmit` 통과
- `npm run build` 통과(10/10 페이지 생성)

### Push 전 AI/비교 지표 동기화

- Gemini 검수에서 `radar-summary.ts`의 `f.comprehension === "high"` 구 로직이 push blocker로 지적됨.
- 추가 검색으로 `cause-analysis`, `improvement-roadmap`, `benchmark`, `trend-analysis`, `class-checklist`, `improvement-cases`와 관련 UI 일부에 구 명칭이 남아 있음을 확인.
- 조치:
  - AI 요약/원인 분석/로드맵/비교 분석 계산을 `computeFeedbackCounts`와 새 4축 기준으로 동기화.
  - 외부 노출 지표명을 `내용 이해`, `자료·예시 도움`, `질문·소통 편의`, `학습 몰입`, `수업 속도`로 통일.
  - 속도는 `very_slow/slow/moderate/fast/very_fast`를 반영해 느림/적당/빠름으로 집계.
  - `radar-summary`는 구 명칭이 포함된 기존 캐시를 legacy summary로 보고 재생성하도록 보정.
- 재검증:
  - `npm run lint` 통과
  - `npx tsc --noEmit` 통과
  - `npm run build` 통과(10/10 페이지 생성)

## F7 — Feedback Form Hotfix
Status: Complete

- 필수 문항 미선택 시 첫 번째 누락 항목만 보여주던 클라이언트/서버 검증을 수정해, 누락된 필수 문항 목록을 한 번에 안내하도록 변경.
- 학생용 폼의 `최대 3P` 배지를 `최대 비교과 포인트 3P`로 명확화.
- 교수용 추가 피드백 링크는 정규 주차 평가와 분리해, 강의 전반에 대한 서술형 `피드백 내용 작성`만 받도록 UI/검증/저장 흐름을 변경.
- 추가 피드백은 `roundId`가 없는 일반 의견으로 저장되며, 현황 요약의 주차/라운드 통계에서는 제외되도록 보정.
- 검증: `npm run lint`, `npx tsc --noEmit`, `npm run build` 통과.

## F8 — Demo Additional Feedback + Comment Diversity
Status: Complete

- `prisma/enrich-demo-database.ts`에 주차별 학생 의견 풀을 추가해 현황 요약, 관리 및 기록, 주차별 리포트, AI 분석 컨텍스트에서 반복 문장이 덜 보이도록 보강.
- 추가 피드백 링크로 들어온 강의 전반 의견은 `Feedback.roundId = null`로 저장되는 구조를 유지하고, 데모 시드에서도 `commentCategory = "추가"` 추가 피드백 8건을 생성.
- 관리 및 기록의 추가 피드백 링크 카드에서 최근 추가 피드백을 직접 확인할 수 있도록 연결.
- 로컬 데모 DB에 `npx tsx prisma/enrich-demo-database.ts` 실행 완료.

## F9 — Comment Filter Tone Hotfix
Status: Complete

- Claude/Gemini post-review에서 `존나/졸라/ㅈㄴ`이 건설적인 피드백까지 하드 차단할 수 있다는 리스크가 지적됨.
- 해당 강조 슬랭은 `blocked`에서 `warned`로 강등해, 학생이 문구를 다듬도록 안내하되 필요하면 제출을 계속할 수 있게 변경.
- `개못함`류의 거친 평가 표현은 하드 차단이 아닌 `warned`로 추가해 정상 비판은 막지 않되 표현 재검토를 유도.
- 차단/경고 문구를 `검열` 느낌보다 `더 정확한 분석을 위한 표현 안내` 톤으로 완화.
- 강한 욕설·인격 모독 표현은 계속 hard block 유지.

## F10 — Opinion Label + Demo Data Refresh
Status: Complete

- 학생용 주관식 두 번째 문항을 `어려웠던 점 또는 더 설명이 필요한 점`에서 `아쉬웠던 점`으로 단순화.
- 서버 저장용 통합 의견 prefix도 `아쉬웠던 점:`으로 변경. 기존 `어려웠던 점:` 데이터는 대시보드 표시 시 `아쉬웠던 점`으로 normalize.
- 데모 데이터베이스 강의는 1~8주차 구조로 보강하고, 8주차를 현재 활성 회차로 설정.
- 데모 학생 의견은 응답별 작성일을 주차/제출 시점에 맞춰 다양화하고, 주차별 comment pool + 문장 길이 변형으로 반복 노출을 줄임.
- 추가 피드백 데모 데이터도 서로 다른 작성일을 갖도록 보정.
