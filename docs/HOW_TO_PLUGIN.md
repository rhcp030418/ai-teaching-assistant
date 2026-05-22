# e-class 연동 플러그인 가이드

한성대학교 e-class(learn.hansung.ac.kr)에서 학생 정보를 스크래핑하여 AI Teaching Assistant에 연동하는 방법.

> **참고 프로젝트:** [hsu-ecx](https://github.com/CcRr0/ecx) — Chrome 확장 프로그램으로 e-class DOM을 파싱하는 구조

> **구현 완료 (2026-04):** 아래 설계를 기반으로 크롬 확장 프로그램이 실제 구현되었습니다.
> - 크롬 확장: `ai-teaching-assistant/chrome-extension/` 디렉토리 (manifest.json — Manifest V3, content.js, sidepanel.html/js, background.js, icons/)
> - 서버 API: `/api/eclass-sync` (POST), `/api/student-courses` (GET)
> - DB 모델: Student, CourseStudent, FeedbackRound, StudentCourseToken, SubmissionLog
> - 익명성 보장: Feedback에 studentId 없음, SubmissionLog로 제출여부만 별도 기록
>
> **안정화 (2026-05, 실제 e-class 검증):**
> - DOM 셀렉터 다중 폴백 — `content.js`의 `getValue()`가 후보 셀렉터를 순서대로 시도 (학교 페이지 구조 변경에 견딤)
> - eclassId 매칭 실패 시 **과목명 기반 자동 매칭** 폴백 (`route.ts`의 `matchedBy: "eclassId" | "title"`), 그래도 실패하면 `unmatched` 배열로 반환 → 사이드패널이 경고 표시
> - 강의자료 업로드 10MB 제한 (서버 `/api/upload` + 프론트 검증)
> - 알려진 한계: e-class 커뮤니티/공지 항목이 과목으로 잘못 스크래핑돼 unmatched에 섞일 수 있음 (필터링 보완 필요)

---

## 1. 핵심 원리

hsu-ecx는 Chrome Extension의 **Content Script**가 e-class 도메인(`learn.hansung.ac.kr`) 안에서 실행되는 점을 이용한다.

```
Content Script (e-class 도메인에서 실행)
  │
  ├── 로그인된 세션 쿠키 자동 포함
  ├── fetch("/내부경로") → 같은 도메인이라 CORS 없음
  ├── DOMParser로 HTML → Document 파싱
  └── CSS 셀렉터로 필요한 데이터 추출
```

**핵심 유틸리티:**

```typescript
const parser = new DOMParser();

async function fetchParse(url: string): Promise<Document> {
  const res = await fetch(url);
  const html = await res.text();
  return parser.parseFromString(html, "text/html");
}
```

---

## 2. 추출 가능한 학생 정보

### 2-1. 프로필 페이지 (`/user/edit.php`)

fetch로 가져와서 파싱하면 아래 정보를 추출할 수 있다:

| 정보 | 셀렉터 | 추출 방식 |
|------|--------|----------|
| 이름 | `#id_firstname` | `.getAttribute("value")` |
| 학번 | `#fitem_id_idnumber .fstatic` | `.textContent.trim()` |
| 이메일 | `#id_email` | `.getAttribute("value")` |
| 학과 | `#id_department` | `.getAttribute("value")` |
| 소속기관 | `#id_institution` | `.getAttribute("value")` |
| 휴대전화 | `#id_phone` | `.getAttribute("value")` |

**구현 코드:**

```typescript
interface UserInfo {
  name: string;
  studentId: string;
  email: string;
  department: string;
  institution: string;
  phone: string;
}

async function fetchUserInfo(): Promise<UserInfo> {
  const doc = await fetchParse("/user/edit.php");

  return {
    name: doc.querySelector("#id_firstname")?.getAttribute("value") ?? "",
    studentId: doc.querySelector("#fitem_id_idnumber .fstatic")?.textContent?.trim() ?? "",
    email: doc.querySelector("#id_email")?.getAttribute("value") ?? "",
    department: doc.querySelector("#id_department")?.getAttribute("value") ?? "",
    institution: doc.querySelector("#id_institution")?.getAttribute("value") ?? "",
    phone: doc.querySelector("#id_phone")?.getAttribute("value") ?? "",
  };
}
```

### 2-2. 페이지 헤더 (모든 페이지)

별도 fetch 없이 현재 페이지 DOM에서 바로 추출 가능:

```typescript
// 이름 (네비게이션 바에 항상 표시됨)
const name = document.querySelector("li.user_department")?.textContent?.trim();

// 학과 (프로필 팝업 내)
const dept = document.querySelector(".user-info-picture .department")?.textContent?.trim();
```

### 2-3. 수강 과목 목록 (`/local/ubion/user/`)

```typescript
interface CourseInfo {
  id: number;
  title: string;
}

async function fetchCourseList(): Promise<CourseInfo[]> {
  const doc = await fetchParse("/local/ubion/user/");
  const rows = doc.querySelectorAll("div.course_lists table > tbody > tr");

  const courses: CourseInfo[] = [];
  for (const row of rows) {
    const tds = row.children;
    if (tds.length < 2) continue;

    const a = tds[1].querySelector("a")!;
    const id = Number(new URL(a.href).searchParams.get("id"));
    const title = a.textContent!.trim();
    courses.push({ id, title });
  }
  return courses;
}
```

### 2-4. 동영상 진도 (`/report/ubcompletion/user_progress.php?id={courseId}`)

```typescript
interface VideoProgress {
  title: string;
  actual: number;   // 실제 시청 시간 (초)
  required: number; // 요구 시간 (초)
}

async function fetchVideoProgress(courseId: number): Promise<VideoProgress[][]> {
  const doc = await fetchParse(`/report/ubcompletion/user_progress.php?id=${courseId}`);
  const table = doc.querySelector("table.user_progress");
  if (!table) return [];

  const rows = table.querySelectorAll(":scope > tbody > tr");
  const result: VideoProgress[][] = [];
  let week = 0;

  for (const row of rows) {
    const tds = row.children;
    const start = [...tds].findIndex(td => td.querySelector("img"));
    if (start === -1) continue;

    const weekEl = tds[0].querySelector("div.sectiontitle");
    if (weekEl) week = Number(weekEl.textContent!.trim());

    const title = tds[start].textContent!.trim();
    const required = timeToSec(tds[start + 1].textContent!.trim());
    const actual = tds[start + 2].firstChild
      ? timeToSec(tds[start + 2].firstChild.textContent!.trim())
      : 0;

    result[week] = result[week] || [];
    result[week].push({ title, actual, required });
  }
  return result;
}

function timeToSec(time: string): number {
  if (!time || time === "0") return 0;
  const parts = time.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return parts[0] * 60 + parts[1];
}
```

### 2-5. 과제/퀴즈 상태

```typescript
// 과제: /mod/assign/view.php?id={id}
interface AssignInfo {
  due: string | null;     // 종료 일시 (ISO)
  submit: string | null;  // 최종 수정 일시 (ISO)
  block: boolean;         // 제출 차단 여부
}

async function fetchAssignInfo(id: number): Promise<AssignInfo> {
  const doc = await fetchParse(`/mod/assign/view.php?id=${id}`);
  const table = doc.querySelector("table.generaltable")!;
  const block = !doc.querySelector("div.submissionaction");

  let due: string | null = null;
  let submit: string | null = null;

  for (const row of table.querySelectorAll(":scope > tbody > tr")) {
    const [titleTd, contentTd] = row.children;
    const title = titleTd.textContent!.trim();
    if (title === "종료 일시") due = new Date(contentTd.textContent!.trim()).toISOString();
    if (title === "최종 수정 일시") {
      const text = contentTd.textContent!.trim();
      if (text !== "-") submit = new Date(text).toISOString();
    }
  }
  return { due, submit, block };
}

// 퀴즈: /mod/quiz/view.php?id={id}
interface QuizInfo {
  from: string | null;
  due: string | null;
  submit: string | null;
}

async function fetchQuizInfo(id: number): Promise<QuizInfo> {
  const doc = await fetchParse(`/mod/quiz/view.php?id=${id}`);

  let from: string | null = null;
  let due: string | null = null;

  for (const info of doc.querySelectorAll("div.quizinfo > p")) {
    const text = info.textContent!.trim();
    if (text.startsWith("시작일시 : ")) from = new Date(text.slice(7).trim()).toISOString();
    if (text.startsWith("종료일시 : ")) due = new Date(text.slice(7).trim()).toISOString();
  }

  const summary = doc.querySelector("table.quizattemptsummary");
  const submitText = summary?.querySelector("span.statedetails")?.textContent?.slice(0, 16);
  const submit = summary ? (submitText ? new Date(submitText).toISOString() : null) : null;

  return { from, due, submit };
}
```

---

## 3. AI Teaching Assistant 연동 방안

### 3-1. 아키텍처 선택지

현재 ai-teaching-assistant는 **웹 서버(Next.js)**이고, e-class 스크래핑은 **브라우저 환경(Content Script)**에서만 가능하다. 연동 방식은 두 가지:

#### 방법 A: Chrome 확장 프로그램 (hsu-ecx 방식)

```
┌─────────────────────┐     chrome.tabs.sendMessage()     ┌──────────────┐
│  사이드패널 / 팝업    │ ◄──────────────────────────────► │ Content Script│
│  (React UI)          │                                   │ (e-class DOM)│
└──────────┬──────────┘                                   └──────────────┘
           │ fetch (POST)
           ▼
┌──────────────────────┐
│  AI Teaching Assistant│
│  Next.js API Route   │
│  /api/eclass-sync    │
└──────────────────────┘
```

- Content Script가 e-class에서 데이터 추출
- 확장 프로그램 UI(팝업/사이드패널)가 Next.js 서버로 POST 전송
- 장점: 브라우저 세션 그대로 활용, CORS 문제 없음
- 단점: 학생이 Chrome 확장 설치 필요

#### 방법 B: 북마클릿 / 인젝션 스크립트

```
학생이 e-class 페이지에서 북마클릿 실행
  │
  ▼
injected script가 DOM에서 정보 추출
  │
  ▼
fetch("https://your-server.com/api/eclass-sync", { ... })
```

- 확장 설치 없이 한 번 클릭으로 실행
- 단점: 매번 수동 실행, CORS 설정 필요

#### 방법 C: 피드백 페이지에서 직접 입력 안내

```
기존 피드백 토큰 링크 + 학생 정보 수동 입력 폼
(이름, 학번 입력란 추가 — 가장 단순하지만 스크래핑 불필요)
```

---

### 3-2. 추천 연동 방식 (방법 A 기반)

AI Teaching Assistant와 연동하려면 **Chrome 확장 프로그램**을 만들어서 다음 흐름을 구현한다:

#### Step 1: 확장 프로그램에서 학생 정보 + 과목 정보 수집

```typescript
// content_scripts/collect.ts
async function collectStudentData() {
  const userInfo = await fetchUserInfo();        // 이름, 학번, 학과 등
  const courses = await fetchCourseList();       // 수강 과목 목록

  return { userInfo, courses };
}
```

#### Step 2: Next.js API Route 추가

```typescript
// src/app/api/eclass-sync/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const data = await req.json();
  // data = { userInfo: { name, studentId, ... }, courses: [...] }

  // 1. 학생 정보 검증 / 저장
  // 2. 수강 과목과 기존 Course 매칭
  // 3. 필요 시 피드백 토큰 자동 발급

  return NextResponse.json({ success: true });
}
```

#### Step 3: 확장 프로그램 → 서버 전송

```typescript
// extension/background.ts 또는 popup.ts
const data = await chrome.tabs.sendMessage(tabId, { type: "COLLECT_ALL" });

await fetch("https://your-server.com/api/eclass-sync", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});
```

---

### 3-3. 활용 시나리오

#### 시나리오 1: 피드백 제출 시 학생 자동 식별

현재는 익명 토큰 기반이지만, e-class 연동 시:

```
학생이 e-class 로그인 상태에서 확장 프로그램 클릭
  → 학생 정보 자동 수집 (이름, 학번)
  → 수강 과목 목록 표시
  → 과목 선택 → 피드백 폼 자동 연결
  → 토큰 없이도 "학번 기반" 1회 제출 제한 가능
```

#### 시나리오 2: 교수 대시보드 과목 자동 등록

교수도 e-class 로그인 → 확장 프로그램으로 담당 과목 자동 동기화:

```
교수 e-class 로그인 → 확장 프로그램
  → 담당 과목 목록 스크래핑
  → AI Teaching Assistant에 과목 자동 생성
  → 수강생 수(studentCount) 자동 반영
```

#### 시나리오 3: 학습 진도 데이터 연동

동영상 시청률, 과제 제출 현황을 피드백과 교차 분석:

```
"동영상 시청률 30% 미만 학생들의 '속도가 빠르다' 응답 비율이 높음"
→ 원인 분석에 객관적 근거 추가
```

---

## 4. 주의사항

### 기술적 제약

- `fetchParse()`는 **브라우저 환경(Content Script)에서만** 동작한다
  - Node.js(Next.js 서버)에서는 e-class 세션 쿠키가 없으므로 직접 스크래핑 불가
  - 반드시 클라이언트(확장 프로그램) → 서버(API Route) 구조로 설계해야 함
- `DOMParser`로 파싱한 HTML에서 `<input>`의 `.value`는 동작하지 않을 수 있음
  - `.getAttribute("value")`를 사용해야 안전
- e-class UI가 변경되면 CSS 셀렉터도 업데이트 필요 (하드코딩된 셀렉터 의존)

### 개인정보 관련

- 학생 개인정보(이름, 학번, 이메일, 전화번호) 수집 시 개인정보보호법 적용 대상
- 수집 목적, 항목, 보유 기간에 대한 동의 절차 필요
- 현재 ai-teaching-assistant의 익명 피드백 설계와 충돌할 수 있음
  - 학생 식별 정보를 피드백과 연결하면 더 이상 "익명"이 아님
  - 학생 식별은 별도 용도(수강 인증, 중복 제출 방지)로만 사용하고, 피드백 내용과 분리 저장하는 것을 권장

### 현재 DB 스키마 (구현 완료)

익명성 보장 설계가 적용되었습니다. Feedback에는 studentId가 없고, 제출 기록은 SubmissionLog에 별도 저장됩니다:

```prisma
// Feedback — 학생 식별 정보 없음 (익명)
model Feedback {
  id                    String         @id @default(cuid())
  courseId              String
  roundId               String?        // 주차별 평가 연결 (FeedbackRound FK)
  speed                 String
  comprehension         String
  communication         Int
  interest              Int?           // 흥미도 1~5
  assignment            Int?           // 과제 적절성 1~5
  practice              Int?           // 실습/예시 충분도 1~5
  comment               String?
  filteredComment       String?
  commentCategory       String?
  commentFilterReason   String?
  commentHasProfanity   Boolean        @default(false)
  createdAt             DateTime       @default(now())
  course                Course         @relation(fields: [courseId], references: [id])
  round                 FeedbackRound? @relation(fields: [roundId], references: [id])
}

// SubmissionLog — 제출 여부만 기록 (피드백 내용과 분리)
model SubmissionLog {
  id        String        @id @default(cuid())
  studentId String
  courseId  String
  roundId   String
  createdAt DateTime      @default(now())
  student   Student       @relation(fields: [studentId], references: [id])
  course    Course        @relation(fields: [courseId], references: [id])
  round     FeedbackRound @relation(fields: [roundId], references: [id])
}
```

이 구조 덕분에 SubmissionLog에서 "이 학생이 이 라운드에 제출했는지"만 확인할 수 있고, 어떤 피드백을 남겼는지는 역추적이 불가능합니다.

---

## 5. 요약

| 항목 | 내용 |
|------|------|
| 스크래핑 방식 | Content Script + `fetch()` + `DOMParser` + CSS 셀렉터 |
| 실행 환경 | 브라우저 전용 (Chrome Extension Content Script) |
| 추출 가능 정보 | 이름, 학번, 이메일, 학과, 수강 과목, 동영상 진도, 과제/퀴즈 상태 |
| 연동 구조 | Chrome 확장 → Content Script 스크래핑 → Next.js API Route로 POST |
| 서버 직접 스크래핑 | 불가 (e-class 세션 쿠키 없음) |
| 주요 셀렉터 | `#id_firstname`, `#fitem_id_idnumber .fstatic`, `li.user_department` 등 |
| 구현 상태 | **완료** — chrome-extension/ 디렉토리, /api/eclass-sync, /api/student-courses |
| 익명성 보장 | Feedback에 studentId 없음, SubmissionLog로 제출 기록만 별도 저장 |
