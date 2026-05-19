# AI Teaching Assistant - Implementation Document

## Project Overview

A self-hosted lecture evaluation platform + AI-powered analysis tool for professors.  
Built for the 1st Hansung University AX Frontier Challenge.

- **Student Side**: Submit structured, anonymous feedback on lectures via one-time token links or multi-use student tokens (Chrome extension integration)
- **Professor Side**: AI-powered dashboard for feedback analysis, lecture material analysis, communication tone correction, and round management
- **Chrome Extension**: e-class integration for automatic student/course sync and feedback access

## Tech Stack

| Category | Choice | Notes |
|----------|--------|-------|
| Frontend + Backend | Next.js 16 (App Router) | Unified project, API Routes for backend |
| Database | SQLite + Prisma 7 | File-based DB, `@prisma/adapter-better-sqlite3` driver adapter |
| Authentication | NextAuth.js v5 | Professor login (Credentials). Students use one-time token links or multi-use student tokens |
| AI Providers | OpenAI / Gemini / Claude / Grok / Ollama | Configured via `.env`, common adapter interface |
| UI | shadcn/ui + Tailwind CSS v4 | Responsive design |
| PDF Text Extraction | unpdf | Text-based PDF extraction (pdf-parse 제거됨) |
| OCR (Scanned PDF) | tesseract.js + unpdf | Korean+English OCR for image-based PDFs |
| Password Hashing | bcryptjs | 12 rounds |

## Project Structure

```
ai-teaching-assistant/
├── prisma/
│   ├── schema.prisma          # DB schema definition
│   ├── migrations/            # Migration files
│   └── seed.ts                # Demo data seeder
├── uploads/                   # Uploaded lecture material files
├── dev.db                     # SQLite database file (project root, NOT prisma/)
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout (lang="ko")
│   │   ├── page.tsx           # Home — landing page (static)
│   │   ├── login/
│   │   │   ├── page.tsx             # Login page
│   │   │   └── login-form.tsx       # Login form (client)
│   │   ├── actions/
│   │   │   ├── auth.ts              # Server Action: login/logout
│   │   │   ├── feedback.ts          # Server Action: submit feedback + token invalidation + background AI filter
│   │   │   ├── tokens.ts            # Server Action: generate/stats for feedback tokens
│   │   │   ├── benchmark.ts         # Server Action: trend comparison data
│   │   │   ├── improvement-cases.ts # Server Action: cross-semester improvement cases + AI insight + professor notes
│   │   │   ├── improvement-notes.ts # Server Action: saveImprovementNote (professor notes on round/semester improvements)
│   │   │   ├── cause-analysis.ts    # Server Action: feedback + material cross-analysis
│   │   │   ├── radar-summary.ts     # Server Action: AI 한줄평 — DB 캐시 우선, 없으면 AI 생성 후 저장 (Course.aiSummary)
│   │   │   ├── analyze-material.ts  # Server Action: AI lecture material analysis + triggerMaterialReanalysisIfNeeded
│   │   │   ├── tone-correction.ts   # Server Action: AI tone correction
│   │   │   ├── rounds.ts           # Server Action: FeedbackRound CRUD (getRounds with status, createRound with startDate/endDate, deleteRound)
│   │   │   ├── round-reports.ts    # Server Action: getRoundReports — closed rounds + significant change detection + semester comparison
│   │   │   ├── trend-analysis.ts   # Server Action: generateTrendNarrative — AI trend narrative + next-round prediction
│   │   │   ├── filter-comments.ts  # Server Action: batch AI comment filter (학습/감정/혼합 분류 + 순화)
│   │   │   ├── class-checklist.ts  # Server Action: AI per-round class checklist (urgent/important/optional, 4 categories)
│   │   │   └── improvement-roadmap.ts # Server Action: AI improvement roadmap — prioritized actions (high/medium/low impact), weeklyGoal, summary
│   │   ├── api/
│   │   │   ├── upload/route.ts            # Route Handler: file upload (auth protected)
│   │   │   ├── ai-chat/[courseId]/route.ts # Route Handler: streaming AI chat (SSE, rate limit 20/min/user, auth protected)
│   │   │   ├── eclass-sync/route.ts       # Route Handler: Chrome ext → Student upsert + CourseStudent + token
│   │   │   ├── student-courses/route.ts   # Route Handler: student courses + active rounds + submission status
│   │   │   └── auth/[...nextauth]/route.ts # NextAuth route handler
│   │   ├── feedback/
│   │   │   └── [courseId]/
│   │   │       ├── page.tsx               # Feedback page (token validated)
│   │   │       └── feedback-form.tsx      # Feedback form (client)
│   │   └── dashboard/
│   │       ├── layout.tsx                 # Dashboard layout (auth protected)
│   │       ├── page.tsx                   # Course list (semester filter via ?semester=)
│   │       ├── semester-selector.tsx      # Semester filter buttons (client)
│   │       ├── sign-out-button.tsx        # Logout button (client)
│   │       ├── course/[courseId]/
│   │       │   ├── page.tsx               # Course dashboard — KPI cards + 3-tab layout + AI chat side panel
│   │       │   ├── analysis-tabs.tsx      # 3-tab layout: 피드백 현황 / 심층 분석 / 비교 분석 (client)
│   │       │   ├── feedback-analysis.tsx  # Analysis visualization + radar chart + AI 한줄평 (AiSummaryLine) + freeText section (client)
│   │       │   ├── radar-chart.tsx        # Dynamic polygon radar chart (SVG, 4~6 axes based on course settings)
│   │       │   ├── benchmark.tsx          # Trend comparison component (client)
│   │       │   ├── improvement-cases.tsx  # Cross-semester improvement cases (client)
│   │       │   ├── cause-analysis.tsx    # Feedback + material cause analysis (client)
│   │       │   ├── token-manager.tsx      # Token link generation (client)
│   │       │   ├── round-manager.tsx     # FeedbackRound management UI (client, startDate/endDate inputs + status badge)
│   │       │   ├── round-reports.tsx     # Per-round summary cards for closed rounds (client)
│   │       │   ├── trend-analysis.tsx    # Weekly trend SVG line chart + AI narrative + next-round prediction (client)
│   │       │   ├── improvement-roadmap.tsx # AI improvement roadmap UI — prioritized action cards (client)
│   │       │   ├── ai-chat.tsx            # AI chat UI — message list + input + SSE streaming display (client)
│   │       │   ├── chat-side-panel.tsx    # Collapsible AI chat side panel (client)
│   │       │   ├── use-ai-chat.ts         # AI chat hook — SSE fetch, message history, retry, copy, export
│   │       │   └── materials/
│   │       │       ├── page.tsx              # Lecture materials list
│   │       │       └── materials-client.tsx  # Upload + AI analysis (client)
│   │       └── tone/
│   │           ├── page.tsx               # Tone correction page
│   │           └── tone-client.tsx        # Tone input + result (client)
│   ├── components/ui/         # shadcn/ui components
│   ├── generated/prisma/      # Prisma generated client
│   └── lib/
│       ├── db.ts              # Prisma client singleton
│       ├── auth.ts            # NextAuth config (Credentials provider)
│       ├── auth-utils.ts      # bcrypt hash/verify
│       ├── comment-filter.ts  # Rule-based profanity/blocked words filter (submit-time)
│       ├── comment-classifier.ts # AI single-comment classifier (background, saves to DB)
│       ├── classify-queue.ts  # Background classification queue (async, timeout + max-size guard)
│       ├── feedback-stats.ts  # Shared feedback statistics (per-course stats, semester utils)
│       ├── round-utils.ts     # FeedbackRound status helpers (getRoundStatus / isRoundActive / isRoundClosed, time-based)
│       ├── constants.ts       # Shared thresholds + limits (FEEDBACK_MIN_COUNT, COMM_AVG_THRESHOLD, etc.)
│       ├── file-extraction.ts # PDF text extraction + OCR fallback (extracted from analyze-material.ts)
│       ├── parse-ai-json.ts   # Safe AI JSON parser (strips markdown fences, extracts first valid JSON block)
│       ├── utils.ts           # shadcn utility + calcResponseRate
│       └── ai/
│           ├── index.ts       # AI entry point — reads .env config
│           ├── config.ts      # AI config from environment variables
│           ├── types.ts       # Common AI interfaces
│           └── providers/
│               ├── openai-compatible.ts  # Shared factory for OpenAI-compatible APIs
│               ├── openai.ts  # OpenAI adapter (via factory)
│               ├── claude.ts  # Anthropic Claude adapter
│               ├── gemini.ts  # Google Gemini adapter
│               ├── grok.ts    # xAI Grok adapter (via factory)
│               └── ollama.ts  # Local AI adapter (via factory)
├── prisma.config.ts
├── .env                       # DB URL + AI provider config + AUTH_SECRET
└── package.json

../chrome-extension/            # Chrome Extension (별도 프로젝트, ai-teaching-assistant 형제 디렉토리)
├── manifest.json               # Manifest V3
├── content.js                  # e-class DOM scraping (Content Script)
├── sidepanel.html              # Side panel UI
├── sidepanel.js                # Side panel logic
├── background.js               # Service worker
└── icons/                      # Extension icons
```

## Features & Implementation Status

### Student Features

| Feature | Status | Description |
|---------|--------|-------------|
| Structured feedback form | Done | Selection-based (speed, comprehension, communication) + optional short text |
| Submit confirmation dialog | Done | Guidance box at bottom of form ("once submitted, cannot be edited for anonymity — write carefully") + `window.confirm()` re-confirmation on submit click. No edit feature (anonymity guarantee) |
| One-time token link access | Done | Professor generates unique links. Each link is single-use, validated server-side |
| Multi-use student token | Done | StudentCourseToken per student, reusable across rounds (submitStudentFeedback action) |
| Anonymous submission | Done | No studentId in Feedback. SubmissionLog records submission separately → structurally untraceable |
| Feedback round awareness | Done | Time-based active round check (startDate <= now < endDate) + duplicate submission block + status-based UI (no active round / already submitted / show form) |
| Chrome extension integration | Done | e-class scraping → server sync → course list with status → feedback link navigation |
| Responsive UI | Done | Works on desktop and mobile |

### Professor Features

| Feature | Status | Description |
|---------|--------|-------------|
| Professor login | Done | NextAuth.js v5 Credentials, bcrypt password hashing |
| Semester-based course filter | Done | Dashboard home page with semester selector buttons, URL query-based filtering |
| Feedback round management | Done | Round manager UI (round-manager.tsx) — create/delete weekly evaluation periods with startDate/endDate inputs. Status (pending/active/closed) auto-derived from current time, no manual open/close |
| Weekly round reports | Done | Main dashboard shows real-time aggregate (all feedbacks, round-agnostic). Closed rounds displayed as separate summary cards (round-reports.tsx) — response count + per-axis averages. Significant change vs previous round detected (±0.5 comm / ±15% comp/speed) → professor note prompt shown |
| Semester comparison card | Done | Top of round-reports section: compares current semester overall stats vs previous (priority: same prof+course > same prof+category > prev year same term same course). Shows "전 학기 내 강의 대비" / "전년 동일 강좌 대비" etc. "이전 데이터 없음" if no prior data |
| Professor improvement notes | Done | When significant change detected (round-level or semester-level), prompt professor to optionally share what they changed. Stored in ImprovementNote (category+axis tagged). Shown anonymously on other professors' improvement case cards (same-category vs other-category) |
| Feedback analysis dashboard | Done | 3-axis bar charts + dynamic radar chart (4~6 polygon based on course settings) + AI 한줄평 (레이더 차트 위 표시, DB 캐시), response rate (%), low-data warning |
| Token link management | Done | Generate N tokens, view stats (total/used/unused), copy all links |
| Benchmark comparison | Done | Compare against same-category avg, semester avg, prev semester avg, percentile rank (anonymous) |
| Weekly trend analysis | Done | SVG line chart (comprehension/speed/communication over rounds, ≥2 closed). "AI 분석" button → Claude narrative + next-round prediction (≥3 rounds). Historical lines + dashed prediction extension |
| Course dashboard tab layout | Done | 3-tab layout via analysis-tabs.tsx: "피드백 현황" (FeedbackAnalysis), "심층 분석" (TrendAnalysis, CauseAnalysis, ImprovementRoadmap), "비교 분석" (Benchmark, ImprovementCases). Right sidebar: RoundManager, TokenManager, RoundReports |
| AI Chat | Done | Streaming AI chat for professors (SSE via /api/ai-chat/[courseId]). Rate limited 20/min per user. Dynamic suggested questions built from course metrics. Message history, copy, export, retry. Side panel overlay (chat-side-panel.tsx) |
| Improvement Roadmap | Done | AI generates prioritized improvement plan: ranked actions with area/problem/action/evidence, impact level (high/medium/low), weekly goal, summary |
| Class Checklist | Done | AI generates per-round action checklist: items with priority (urgent/important/optional), category (content/pace/communication/material), action, reason, plus encouragement message |
| Lecture material analysis | Done | PDF/PPT/TXT upload (auth+ownership check), AI analysis (PDF: unpdf 텍스트 추출 → 짧으면 OCR 폴백) |
| Scanned PDF OCR | Done | tesseract.js + unpdf for image-based PDFs (Korean + English) |
| Cause-connection analysis | Done | Cross-analyze feedback + lecture materials to estimate possible causes |
| Tone correction | Done | Input text -> detect authoritative expressions -> suggest softer alternatives |
| Student free-text input | Done | 피드백 폼에 자유 서술 섹션 추가 (AI 필터링 없이 원문 그대로 전달, Feedback.freeText 필드) |

### System Features

| Feature | Status | Description |
|---------|--------|-------------|
| AI multi-provider adapter | Done | Common interface, OpenAI-compatible factory for openai/grok/ollama. NVIDIA NIM도 AI_PROVIDER=openai + AI_BASE_URL로 사용 가능 |
| AI config via .env | Done | `AI_PROVIDER`, `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` |
| Response rate + low-data warning | Done | Shows response rate (%), 20% warning, dims charts when < 3 responses |
| Improvement cases | Done | Cross-semester comparison of anonymous professors, AI-generated personalized insights (myStats passed to AI), professor notes shown by same/other category |
| Comment AI filter (background) | Done | On submit: save immediately, classify in background (학습/감정/혼합), store result in DB. Dashboard shows only classified 학습/혼합 comments (감정 removed, unclassified hidden until AI completes). AI failure → commentCategory=null (hidden) |
| Student system + e-class sync | Done | Student, CourseStudent, FeedbackRound, StudentCourseToken, SubmissionLog models. /api/eclass-sync, /api/student-courses API endpoints |
| Chrome extension | Done | Manifest V3, Content Script (e-class DOM scraping), Side Panel UI, Background service worker. Separate project (chrome-extension/) |
| Demo data seeding | Done | 12 professors, 30 courses (3 semesters, 4 categories), 623 feedbacks (incl. abusive samples), 4 improvement cases, 10 students, 20 course enrollments, 20 student tokens, 14 feedback rounds (인공지능 개론 8주차 + 데이터베이스 6주차, 3월 3일 기준), 8 improvement notes (교양/경영·경제/컴퓨터과학) |
| Auth protection | Done | Dashboard pages, upload API, token generation |

## AI Configuration

Set in `.env` file (backend only):

```env
AI_PROVIDER="openai"    # openai | claude | gemini | grok | ollama
AI_API_KEY="sk-..."     # API key (not needed for ollama)
AI_BASE_URL=""           # Optional custom endpoint
AI_MODEL=""              # Optional model override (defaults per provider)
```

Default models per provider:
- OpenAI: `gpt-4o`
- Claude: `claude-sonnet-4-6`
- Gemini: `gemini-2.5-flash`
- Grok: `grok-3-mini`
- Ollama: `llama3`

## Student Access

### One-Time Token Link (기존)
- Professor generates N unique token links via dashboard (batch insert with `createMany`)
- Student accesses `/feedback/{courseId}?token=xxx`
- Server validates: token exists, matches courseId, not used
- On submit: feedback created + token marked `used=true` in a single transaction

### Multi-Use Student Token (신규 — 크롬 확장 연동)
- Student is assigned a StudentCourseToken per course (via /api/eclass-sync)
- Student accesses `/feedback/{courseId}?token=xxx`
- Feedback page checks active FeedbackRound + duplicate submission (via SubmissionLog)
- On submit: Feedback created (with roundId) + SubmissionLog recorded separately
- Anonymity by design: Feedback has no studentId field. SubmissionLog only records that a submission happened

## DB Schema

```prisma
Professor          -> id, name, email, password(bcrypt), courses[]
Course             -> id, name, semester, category(default:"교양"), studentCount?, eclassId?, hasAssignment(default:false), hasPractice(default:false), aiSummary?(AI 한줄평 캐시), professorId, feedbacks[], feedbackTokens[], lectureMaterials[], feedbackRounds[], courseStudents[], improvementNotes[]
Feedback           -> id, courseId, roundId?, speed, comprehension, communication(1-5), interest?(1-5), assignment?(1-5), practice?(1-5), comment?, freeText?(자유 서술 원문), filteredComment?, commentCategory?, commentFilterReason?, commentHasProfanity(default:false)
FeedbackToken      -> id, token(unique), courseId, used(default:false)
LectureMaterial    -> id, courseId, fileName, filePath, analysis?(JSON)
ImprovementNote    -> id, courseId, roundId?(null=학기레벨), category, axis(comprehension|speed|communication|interest), changeDelta, note (교수가 직접 작성한 개선 노트)
Student            -> id, studentNo(unique), name, email?, department?, courseStudents[], studentCourseTokens[], submissionLogs[]
CourseStudent      -> id, studentId, courseId (수강등록)
FeedbackRound      -> id, courseId, week, label?, startDate, endDate, feedbacks[], submissionLogs[], improvementNotes[] (status pending/active/closed derived from startDate/endDate)
StudentCourseToken -> id, studentId, courseId, token(unique) (다회용 토큰)
SubmissionLog      -> id, studentId, courseId, roundId, createdAt (제출기록 — Feedback과 분리, 익명성 보장)
```

## Deployment

- Local demo or simple server deployment
- No external service dependency except chosen AI API
- SQLite DB file at project root (`dev.db`)
- Run `npx tsx prisma/seed.ts` to populate demo data
