# AI Teaching Assistant

제1회 한성대학교 AX 프런티어 챌린지 출품작

**자체 강의평가 플랫폼 + 교수용 AI 분석 도구**

## 소개

기존 익명 커뮤니티(에브리타임)나 강의평가에서 나타나는 감정적이고 과도하게 직설적인 피드백 문제를 해결합니다.

- **학생**: 구조화된 방식으로 익명 피드백 작성 (1회용 토큰 링크 또는 크롬 확장 연동 다회용 토큰으로 접근)
- **교수**: AI 기반 피드백 분석, 강의자료 분석, 소통 톤 보정

## 주요 기능

### 학생용
- 선택형 중심 + 점수 평가 (흥미도, 과제 적절성, 실습 충분도) + 짧은 서술형 보조 피드백 폼 + 자유 서술 (AI 필터링 없이 원문 전달)
- 완전 익명 (1회용 토큰 링크 또는 다회용 학생 토큰, 피드백에 학생 정보 미저장)
- 욕설/비하 규칙 기반 차단 + 감정적 표현 경고
- 제출 시 AI가 백그라운드로 코멘트 분류·순화 (학생 응답 블로킹 없음)
- 주차별 평가(라운드) 지원: 시간 기반(startDate/endDate) 활성 라운드 자동 판단, 중복 제출 차단, 상태별 화면 분기
- 제출 확인 다이얼로그: 폼 하단 안내 박스 + 제출 버튼 클릭 시 재확인. 익명성 보장을 위해 제출 후 수정 불가
- 크롬 확장 프로그램 연동: e-class에서 자동 수강과목 동기화 + 피드백 링크 이동
- 데스크톱/모바일 반응형 UI

### 교수용
- 대시보드 탭 구조: 피드백 현황 / 심층 분석 / 비교 분석 3탭으로 구성
- 피드백 분석: 동적 레이더 차트 (강의 설정에 따라 4~6각형 종합 평가) + AI 한줄평 (레이더 차트 위 표시, DB 캐시) + 3축 막대 차트 (수업 속도 / 자료 이해도 / 소통 만족도) + 응답률(%) + 저응답 경고
- AI 감정 필터: 학습/감정/혼합 분류 후 건설적 피드백만 표시 (감정적 코멘트 자동 제거, 혼합은 순화 버전만 표시)
- AI 채팅: 교수가 강의 데이터를 기반으로 AI와 자유 대화. SSE 스트리밍, 지표 기반 추천 질문, 메시지 복사/내보내기
- AI 개선 로드맵: 피드백 기반 우선순위별 개선 계획 자동 생성 (즉시 개선 / 개선 권장 / 관찰 필요)
- AI 수업 체크리스트: 라운드별 행동 항목 자동 생성 (긴급/중요/선택 우선순위, 4개 카테고리)
- 학기별 과목 조회: 대시보드 첫 페이지에서 연도/학기 선택 → 해당 학기 과목만 필터링
- 주차별 평가 라운드 관리: 시작/종료 시각 기반 라운드 생성/삭제 (round-manager.tsx). 상태 뱃지(대기/진행 중/종료)는 현재 시각으로 자동 결정
- 주차별 리포트: 메인 대시보드는 실시간 전체 집계, 종료된 라운드별 요약 카드는 별도 섹션(round-reports.tsx)으로 표시 — 응답 수 + 속도/이해도/소통/흥미도/과제/실습 평균
- 토큰 링크 관리: N개 일괄 생성, 사용 현황 확인, 전체 복사
- 강의자료 분석: PDF/PPT/TXT 업로드(10MB 제한) → AI 핵심 요약, 난이도, 용어 밀도, 예시 충분도, 개선 제안. 종료된 라운드가 있으면 백그라운드에서 자동 재분석
- 스캔 PDF OCR: 사진 기반 PDF도 한국어+영어 텍스트 추출
- 공지/메일 톤 보정: 권위적 표현 감지 → 부드러운 대안 제시, 원문 vs 수정문 비교
- 원인 연결 분석: 피드백 + 강의자료를 교차 분석하여 가능한 원인 추정
- 주차별 트렌드 분석: 종료된 라운드들의 이해도·소통·속도 변화를 SVG 라인 차트로 시각화 + AI 트렌드 내러티브 생성 + 다음 주차 예측 (3회차 이상)
- 경향 비교: 유사 교과목 평균, 학기 전체 평균, 작년 평균 대비 내 위치 + 상위 % (다른 교수 익명)
- 개선 사례 분석: 학기 간 성과 향상 교수 사례 표시 + AI 인사이트 생성

### 크롬 확장 프로그램 (e-class 연동)
- 한성대학교 e-class(learn.hansung.ac.kr) Content Script로 학생정보 + 수강과목 자동 추출 (DOM 셀렉터 다중 폴백)
- 서버 동기화: Student upsert + CourseStudent 등록 + StudentCourseToken 자동 발급
- 과목 매칭: eclassId 우선 → 과목명 기반 자동 매칭 폴백 → 실패 시 사이드패널에 경고 표시
- 사이드패널에서 과목별 상태 표시 (활성/제출 완료/기간 아님)
- 과목 클릭시 개인 피드백 링크로 이동
- 프로젝트 내 `chrome-extension/` 디렉토리 (Manifest V3)

### AI 멀티 프로바이더
- OpenAI (GPT-4o)
- Anthropic Claude
- Google Gemini
- xAI Grok
- Ollama (로컬 AI)

`.env` 파일에서 프로바이더와 API 키를 설정합니다.

## 기술 스택

| 항목 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (App Router) |
| DB | SQLite + Prisma 7 |
| UI | shadcn/ui + Tailwind CSS v4 |
| AI | OpenAI / Gemini / Claude / Grok / Ollama |
| 인증 | NextAuth.js v5 (교수) + 1회용 토큰 / 다회용 학생 토큰 (학생) |
| 비밀번호 | bcryptjs |
| PDF/OCR | unpdf (텍스트 추출) + tesseract.js (OCR) |

## 빠른 시작

> 사전 준비: **Node.js 20.9 이상**

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 준비 (.env.example 복사 후 값 입력)
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env

# 3. DB 생성 + 초기 관리자 계정 시드 (prisma generate + migrate + seed)
npm run setup

# 4. 개발 서버 실행
npm run dev
```

브라우저에서 `http://localhost:3000` 으로 접속합니다.

`.env` 의 `AUTH_SECRET`(필수)은 아래 명령으로 생성해 넣으세요. AI 분석·채팅 기능을 쓰려면 `AI_API_KEY` 도 입력해야 합니다.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

자세한 실행 방법은 [docs/SERVER_RUN_GUIDE.md](./docs/SERVER_RUN_GUIDE.md), AI 프로바이더 설정은 [docs/AI_SETUP_GUIDE.md](./docs/AI_SETUP_GUIDE.md)를 참고하세요.

### 첫 로그인 (초기 관리자 계정)

`npm run setup`/`npm run db:seed` 은 `.env` 의 `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` 으로 교수 계정 1개를 생성합니다(기본값 `admin@example.com` / `changeme1234`). **운영 전 비밀번호를 반드시 변경하세요.**

강의·학생은 로그인 후 `prisma/add-user.ts` 스크립트로 등록합니다([docs/DB_GUIDE.md](./docs/DB_GUIDE.md)). 화면을 미리 채워 보려면 예시 데이터를 넣을 수 있습니다:

```bash
npm run seed:example   # 예시 강의 1개 + 회차 2개 + 익명 피드백 16건
```

## 문서

| 문서 | 내용 |
|------|------|
| [docs/SERVER_RUN_GUIDE.md](./docs/SERVER_RUN_GUIDE.md) | 설치 · 환경변수 · DB 초기화 · 서버 실행 |
| [docs/AI_SETUP_GUIDE.md](./docs/AI_SETUP_GUIDE.md) | AI 프로바이더 선택 (API vs 로컬, 사양별 추천) |
| [docs/DB_GUIDE.md](./docs/DB_GUIDE.md) | 교수/강의/학생 데이터 등록 |
| [docs/HOW_TO_PLUGIN.md](./docs/HOW_TO_PLUGIN.md) | e-class 연동 크롬 확장 가이드 |
| [docs/IMPLEMENTATION.md](./docs/IMPLEMENTATION.md) | 전체 구현 상태 · 파일 트리 |
| [docs/PIPELINE.md](./docs/PIPELINE.md) | 시스템 파이프라인 · 데이터 흐름 |
| [docs/reference.md](./docs/reference.md) | 검증된 교수법 38선 + 연구 출처 |

## 라이선스

이 프로젝트는 한성대학교 AX 프런티어 챌린지를 위해 제작되었습니다.
