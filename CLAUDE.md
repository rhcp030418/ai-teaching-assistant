@AGENTS.md

# AI Teaching Assistant

제1회 한성대학교 AX 프런티어 챌린지 출품작.
자체 강의평가 플랫폼 + 교수용 AI 분석 도구.

## 프로젝트 구조

- Next.js 16 App Router (src/app/)
- Prisma 7 + SQLite (dev.db는 프로젝트 루트에 위치, prisma/ 폴더 아님)
- Prisma 7은 driver adapter 필수: `@prisma/adapter-better-sqlite3` 사용
- `PrismaClient` 생성 시 반드시 `{ adapter: new PrismaBetterSqlite3({ url }) }` 전달
- shadcn/ui 컴포넌트는 src/components/ui/
- AI 어댑터는 src/lib/ai/ (5개 프로바이더: openai, claude, gemini, grok, ollama)
- OpenAI 호환 프로바이더(openai, grok, ollama)는 `openai-compatible.ts` 공통 함수로 생성
- AI 설정은 .env에서 관리 (AI_PROVIDER, AI_API_KEY, AI_BASE_URL, AI_MODEL)

## 인증 구조

- 교수: NextAuth.js v5 (next-auth@beta), Credentials provider, bcryptjs 해싱
- 교수 대시보드(/dashboard)는 layout.tsx에서 auth() 세션 체크로 보호
- 학생 (1회용 토큰): 1회용 토큰 링크 (?token=xxx) — 토큰 없이는 피드백 페이지 접근 불가
- 토큰은 제출 시 트랜잭션으로 소멸 처리 (feedback 생성 + token.used=true)
- 학생 (다회용 토큰): StudentCourseToken 기반 — 학생 개인에게 배정, 매 라운드 제출 가능 (submitStudentFeedback action)
- 익명성 보장 설계: Feedback에 studentId 없음, SubmissionLog로 제출여부만 별도 기록 → 구조적으로 역추적 불가
- 파일 업로드 API도 auth() 체크 + 강의 소유권 검증 포함
- Server Actions `analyzeMaterial`, `analyzeCauses`, `filterComments`도 auth() + 소유권 검증 포함
- `getTokenStats`도 auth() + 소유권 검증 포함

## 주요 규칙

- 코드 변경 전 반드시 사용자에게 확인받기
- Server Component에서 DB 접근하는 페이지는 `export const dynamic = "force-dynamic"` 필수
- html lang="ko"
- PDF 텍스트 추출: unpdf (extractText) 사용, 텍스트가 50자 미만이면 스캔 PDF로 판단 → tesseract.js + unpdf로 OCR 폴백. pdf-parse는 제거됨
- 홈 페이지(/)는 랜딩 페이지 (DB 접근 없음, static)
- Course 모델에 category 필드 있음 (벤치마크 비교에 사용)
- Course 모델에 eclassId 필드 있음 (e-class 연동용)
- Course 모델에 hasAssignment Boolean @default(false), hasPractice Boolean @default(false) 있음 (레이더 차트 축 결정)
- Feedback 모델에 roundId 필드 있음 (주차별 평가 연결, FeedbackRound FK)
- Feedback 모델에 interest Int? (흥미도 1~5), assignment Int? (과제 적절성 1~5), practice Int? (실습/예시 충분도 1~5) 있음
- 벤치마크: 유사 교과목 평균, 학기 전체 평균, 작년 평균, 상위 % (다른 교수는 익명)
- 개선 사례: 학기 간 성과 향상 교수 사례 + AI 인사이트 (improvement-cases.ts/tsx)
- 원인 연결 분석: 피드백 + 강의자료 교차 분석으로 원인 추정 (cause-analysis.ts/tsx)
- Course 모델에 studentCount 필드 있음 (응답률 % 표시에 사용)
- Course 모델에 aiSummary String? 있음 (AI 한줄평 DB 캐시 — 종료된 라운드 있으면 after()로 백그라운드 사전 계산, radar-summary.ts)
- 공통 통계 유틸: src/lib/feedback-stats.ts (벤치마크 + 개선 사례에서 공유)
- 코멘트 AI 필터링: 학생 제출 시 백그라운드 처리 → DB 저장 (comment-classifier.ts)
- Feedback 모델에 filteredComment, commentCategory, commentFilterReason 필드 있음
- 대시보드 코멘트 표시 정책: AI 분류 완료된 학습/혼합만 표시, 감정은 제거, 미분류(null)는 숨김
- 동적 레이더 차트: 강의 설정(hasAssignment/hasPractice)에 따라 4~6각형 SVG 다각형 차트 (radar-chart.tsx)
  - 기본 4축: 수업 속도, 자료 이해도, 소통 만족도, 강의 흥미도
  - 선택 축: 과제 적절성 (hasAssignment=true), 실습/예시 충분도 (hasPractice=true)
- 혼합 코멘트는 순화 버전만 표시, 원문/카테고리 뱃지 등은 교수에게 노출하지 않음
- 대시보드 첫 페이지에서 학기별 과목 필터링 가능 (semester-selector.tsx, URL query: ?semester=2026-1)
- 주차별 리포트: 메인 대시보드 통계는 실시간(라운드 무관 모든 피드백 집계). 종료된 라운드별 요약 카드는 별도 컴포넌트(round-reports.tsx)로 표시 — RoundManager 다음 위치. `getRoundReports()`는 `{ rounds, currentSemester, semesterComparison }` 반환
  - 이전 라운드 대비 눈에 띄는 변화 감지 (소통 ±0.5점, 이해도/속도 ±15%) → NotePrompt UI 표시
  - 학기 결산 카드: 같은 교수+강좌명 → 같은 교수+분야 → 전년 동일 강좌명 순으로 비교 대상 탐색
  - 이전 데이터 없으면 "이전 학기 데이터 없음" 카드 표시
- 교수 노트 (ImprovementNote): 라운드/학기 레벨에서 변화 감지 시 교수가 "바꾼 점"을 선택적으로 작성
  - roundId=null이면 학기 레벨 노트, roundId 있으면 라운드 레벨 노트
  - category, axis(comprehension|speed|communication) 태그됨
  - 개선 사례 카드에서 같은 분야 / 다른 분야로 구분해 익명 표시
  - Server Action: `src/app/actions/improvement-notes.ts`의 `saveImprovementNote(courseId, roundId|null, axis, delta, note)`
- next.config.ts에서 devIndicators: false 설정됨
- 주차별 트렌드 분석: 종료된 라운드 2개 이상 시 SVG 라인 차트 표시 (이해도/소통/속도적절 3개 시계열). "AI 분석" 버튼 클릭 시 generateTrendNarrative() 호출 → 트렌드 내러티브 + 다음 주차 예측 (3개 이상 시)
  - Server Action: `src/app/actions/trend-analysis.ts`의 `generateTrendNarrative(courseId, rounds[])`
  - 컴포넌트: `trend-analysis.tsx` — SVG 차트(역사 데이터 실선, 예측 점선) + AI 내러티브 박스
- AI 채팅: 교수가 강의 데이터를 기반으로 AI와 자유 대화. `/api/ai-chat/[courseId]` Route Handler (SSE 스트리밍, 유저당 20회/분 레이트 리밋). 컴포넌트: chat-side-panel.tsx(플로팅 오버레이) + ai-chat.tsx + use-ai-chat.ts 훅(SSE fetch, 히스토리, 재시도, 복사, 내보내기). 추천 질문은 지표 기반으로 page.tsx의 buildChatSuggestions()가 동적 생성
- 검증된 교수법 도구상자: 개선 제안을 생성하는 4개 프롬프트(improvement-roadmap, class-checklist, cause-analysis, analyze-material)는 `src/lib/teaching-methods.ts`의 `TEACHING_TOOLBOX`를 system 프롬프트에 주입한다. 능동학습/동료 교수법/인출 연습/형성평가 등 교육학·인지과학 연구 기반 기법을 5개 지표 문제에 매핑한 것으로, AI가 막연한 조언 대신 "문제 → 검증된 기법의 구체적 행동(기법명 괄호 표기)"으로 작성하도록 유도. 새 개선 제안 프롬프트 추가 시 이 상수를 함께 주입할 것
- AI 개선 로드맵: 피드백 기반 우선순위별 개선 계획 (high/medium/low impact, area/problem/action/evidence + weeklyGoal + summary). Server Action: `src/app/actions/improvement-roadmap.ts`, 컴포넌트: improvement-roadmap.tsx (탭2 "심층 분석")
- AI 수업 체크리스트: 종료된 라운드별 행동 항목 (urgent/important/optional 우선순위, content/pace/communication/material 카테고리 + 격려 메시지). Server Action: `src/app/actions/class-checklist.ts`의 `generateClassChecklist(courseId, roundId)`, UI는 round-reports.tsx 안에서 라운드별 [체크리스트 생성] 버튼
- 강의자료 자동 재분석: 종료된 라운드 있으면 페이지 로드 후 `triggerMaterialReanalysisIfNeeded(courseId)`로 백그라운드 재분석 (LectureMaterial.analysisUpdatedAt staleness 기준). 강의자료는 roundId로 주차 연결 가능
- 파일 업로드: `/api/upload`에서 10MB 제한 + 강의 소유권 검증 + 경로 탈출 방어. 저장 경로는 `src/lib/uploads.ts`의 UPLOADS_DIR(환경변수로 영구 볼륨 지정 가능)
- 배포: Railway 지원 (`railway.toml` — migrate deploy + seed-prod.ts + start). 보조 스크립트는 prisma/(add-user, clear-rounds, add-demo-*)와 scripts/(강의자료 PDF 생성, AI 한줄평 캐시 리셋/시드)
- 대시보드 레이아웃: max-w-[1440px] + px-8 (기존 max-w-6xl + px-4에서 확장)
- 코스 페이지 구조: 상단 KPI 4칸(총응답/소통만족도/이해도높음/속도적절) → 2컬럼 그리드(LEFT:3탭 분석 | RIGHT:관리 사이드바 380px) + 우측 하단 AI 채팅 플로팅(ChatSidePanel)
  - LEFT는 3탭 (analysis-tabs.tsx, `feedbackTab`/`deepTab`/`compareTab` 슬롯에 page.tsx에서 컴포넌트 주입):
    - 탭1 "피드백 현황": FeedbackAnalysis(hideTitle=true, AI한줄평+레이더차트+3축막대+코멘트) + TrendAnalysis
    - 탭2 "심층 분석": CauseAnalysis + ImprovementRoadmapPanel (피드백 3건 이상일 때만, 미만이면 안내 문구)
    - 탭3 "비교 분석": Benchmark + ImprovementCases
  - RIGHT: RoundManager, TokenManager, RoundReports (RoundReports 안에서 종료된 라운드별 ClassChecklist 생성 제공)
- FeedbackAnalysis에 `hideTitle?: boolean` prop — true이면 강의명/교수/학기 헤더 숨김 (page.tsx에서 별도로 표시).
- 레이더 차트는 벤치마크 분야 평균(categoryRadarAxes)을 함께 오버레이할 수 있음 (page.tsx에서 benchmarkData 전달)

## 학생 시스템 + 크롬 확장 연동

- DB 모델: Student (학번/이름/이메일/학과), CourseStudent (수강등록), FeedbackRound (주차별 평가기간, startDate/endDate 시각 기반), StudentCourseToken (학생별 다회용 토큰), SubmissionLog (제출기록)
- FeedbackRound는 `active` 플래그 없이 `startDate`/`endDate`로 상태 자동 판단 (pending/active/closed) — `src/lib/round-utils.ts`의 `getRoundStatus()`, `isRoundActive()`, `isRoundClosed()` 사용
- 활성 라운드 쿼리: `where: { startDate: { lte: now }, endDate: { gt: now } }` (feedback.ts, /api/student-courses, 피드백 페이지 등)
- 피드백 페이지: 활성 라운드 확인 + 중복 제출 차단 + 상태별 화면 분기 (기간 아님/이미 제출/폼 표시)
- 서버 API: /api/eclass-sync (POST, 크롬 확장→학생 upsert+수강등록+토큰 발급), /api/student-courses (GET, 학번으로 수강과목+라운드 상태+제출여부 조회, 시간 기반 활성 라운드)
- 교수 대시보드: FeedbackRound 관리 UI (round-manager.tsx) — 시작/종료 datetime-local 입력으로 라운드 생성/삭제, 상태 뱃지(대기/진행 중/종료) 표시, 수동 열기/닫기 없음
- Server Actions: rounds.ts (getRounds: startDate/endDate/status 포함, createRound: startDate/endDate 인자, deleteRound) — toggleRound 제거됨
- 피드백 폼 제출 확인: FeedbackForm은 하단에 "한 번 제출하면 익명성 보장을 위해 수정할 수 없습니다. 신중하게 작성해주세요." 안내 박스 + 제출 시 window.confirm() 재확인 다이얼로그. 익명성 보장을 위해 제출 후 수정 기능은 없음
- 크롬 확장 프로그램: 별도 프로젝트 (chrome-extension/) — manifest.json, content.js, sidepanel.html/js, background.js
- 크롬 확장 동작: e-class(learn.hansung.ac.kr) Content Script로 학생정보+수강과목 추출 → 서버 동기화 → 과목별 상태 표시 → 피드백 링크 이동

## 빌드 & 실행

```bash
npm install
npx prisma generate
npx prisma migrate dev
npx tsx prisma/seed.ts   # 데모 데이터
npm run dev
```

## 데모 계정

- 이메일: kim@hansung.ac.kr
- 비밀번호: demo1234

## 관련 문서

- docs/EASIEST_WAY_TO_START.md: 가장 쉽게 시작하는 법 (문서 인덱스)
- docs/IMPLEMENTATION.md: 전체 구현 상태
- docs/PIPELINE.md: 시스템 파이프라인, 데이터 흐름
- docs/TODO.md: 할일 목록
- docs/SERVER_RUN_GUIDE.md: 서버 실행 가이드
- docs/AI_SETUP_GUIDE.md: AI 프로바이더 선택 가이드 (API vs 로컬)
- docs/DB_GUIDE.md: 교수/강의/학생 데이터 등록 가이드
- docs/HOW_TO_PLUGIN.md: e-class 연동 플러그인 가이드
- README.md: 프로젝트 소개
