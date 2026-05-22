# DB 등록 가이드

시스템에 교수/강의/학생 데이터를 등록하는 방법.

---

## 1. 데모 데이터 일괄 등록 (시드)

```bash
npx tsx prisma/seed.ts
```

교수 12명, 강의 30개, 피드백 646건, 평가 라운드 14개, 학생 10명, 강의자료 6건 등이 한 번에 생성됩니다.
**주의:** 기존 데이터를 전부 삭제하고 다시 생성합니다.

> 프로덕션(Railway) 배포 시에는 `prisma/seed-prod.ts`가 사용됩니다 (`railway.toml`의 `startCommand`).
> 그 외 보조 스크립트: `prisma/clear-rounds.ts`(라운드 초기화), `prisma/add-demo-comparisons.ts`·`add-demo-community.ts`(데모 보강), `scripts/`(강의자료 생성용 Python 스크립트, AI 한줄평 캐시 리셋/시드 등).

---

## 2. 개별 등록 (스크립트)

`prisma/add-user.ts`를 참고하여 원하는 데이터를 등록할 수 있습니다.

### 등록 순서

반드시 아래 순서를 지켜야 합니다 (FK 의존성):

```
1. Professor (교수)
2. Course (강의) — professorId 필요, eclassId 필요 (크롬 확장 연동용)
3. Student (학생)
4. CourseStudent (수강 등록) — courseId + studentId
5. StudentCourseToken (학생 토큰) — courseId + studentId
6. FeedbackRound (평가 라운드) — courseId
```

### 교수 등록

```typescript
const bcrypt = require("bcryptjs");
const pw = await bcrypt.hash("원하는비밀번호", 12);

await prisma.professor.create({
  data: {
    name: "교수 이름",
    email: "email@hansung.ac.kr",  // 로그인용 (unique)
    password: pw,                   // bcrypt 해싱 필수
  },
});
```

### 강의 등록

```typescript
await prisma.course.create({
  data: {
    name: "강의명",
    semester: "2026-1",             // 형식: "연도-학기번호"
    category: "컴퓨터과학",          // 교양, 컴퓨터과학, 수학·통계, 공학, 경영·경제, 인문·사회, 자연과학, 예체능
    studentCount: 35,               // 수강생 수 (응답률 계산용)
    eclassId: 12345,                // e-class 과목 ID (URL의 ?id= 값)
    hasAssignment: true,            // 과제가 있는 강의 → 레이더 차트에 "과제 적절성" 축 추가
    hasPractice: true,              // 실습이 있는 강의 → 레이더 차트에 "실습/예시 충분도" 축 추가
    professorId: professor.id,      // 위에서 생성한 교수의 ID
  },
});
```

**eclassId 확인 방법:** e-class에서 해당 강의에 들어가면 URL이 `learn.hansung.ac.kr/course/view.php?id=12345` 형태입니다. 여기서 `id=` 뒤의 숫자가 eclassId입니다.

**hasAssignment / hasPractice 설정:**
- `hasAssignment: true` — 과제가 있는 강의. 피드백 폼에 "과제 적절성" 항목이 추가되고, 레이더 차트에 해당 축이 표시됩니다.
- `hasPractice: true` — 실습/예시가 있는 강의. 피드백 폼에 "실습/예시 충분도" 항목이 추가되고, 레이더 차트에 해당 축이 표시됩니다.
- 둘 다 `false` (기본값) → 4각형 레이더 차트 (수업 속도, 자료 이해도, 소통 만족도, 강의 흥미도)
- 둘 다 `true` → 6각형 레이더 차트 (위 4개 + 과제 적절성 + 실습/예시 충분도)

### 학생 등록

```typescript
await prisma.student.upsert({
  where: { studentNo: "0000001" },   // 학번 (unique)
  update: { name: "학생A" },
  create: {
    studentNo: "0000001",
    name: "학생A",
    email: "studentA@example.ac.kr", // 선택
    department: "컴퓨터공학과",       // 선택
  },
});
```

> 크롬 확장을 사용하면 학생이 e-class에서 사이드 패널을 열 때 `/api/eclass-sync`를 통해 **자동으로 등록**됩니다. 수동 등록이 필수는 아닙니다.

### 수강 등록 + 토큰 발급

```typescript
const crypto = require("crypto");

// 수강 등록
await prisma.courseStudent.create({
  data: { courseId: course.id, studentId: student.id },
});

// 다회용 토큰 발급 (학생별 고유 링크)
await prisma.studentCourseToken.create({
  data: {
    token: crypto.randomBytes(16).toString("hex"),
    courseId: course.id,
    studentId: student.id,
  },
});
```

> 이것도 크롬 확장 `/api/eclass-sync`에서 자동 처리됩니다.

### 평가 라운드 생성

라운드는 `startDate` / `endDate` 시각 기반으로 자동 판단됩니다.
- `now < startDate` → 대기(pending)
- `startDate <= now < endDate` → 진행 중(active, 학생 제출 가능)
- `now >= endDate` → 종료(closed, 교수 리포트에 집계)

```typescript
// 1~6주차 생성. 마지막 주차만 "진행 중", 나머지는 "종료"로 자동 배치
const now = new Date();
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

for (let week = 1; week <= 6; week++) {
  const isCurrent = week === 6;
  // 마지막 주차: 지금 ~ 7일 뒤 / 이전 주차: 과거 구간
  const startDate = isCurrent
    ? new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)
    : new Date(now.getTime() - (6 - week + 1) * WEEK_MS);
  const endDate = isCurrent
    ? new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000)
    : new Date(now.getTime() - (6 - week) * WEEK_MS);

  await prisma.feedbackRound.create({
    data: {
      courseId: course.id,
      week,
      label: `${week}주차`,
      startDate,
      endDate,
    },
  });
}
```

> 라운드는 **교수 대시보드에서도 관리 가능**합니다 (주차별 평가 관리 UI에서 시작/종료 datetime 지정).
> 수동 "열기/닫기" 버튼은 없으며, 현재 시각에 따라 `pending` / `active` / `closed` 상태가 자동으로 결정됩니다.

---

## 3. 전체 등록 스크립트 예시

`prisma/add-user.ts` 파일을 복사하여 수정한 뒤 실행:

```bash
npx tsx prisma/add-user.ts
```

**예시 코드 (add-user.ts):**

```typescript
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import path from "node:path";

const dbPath = path.join(process.cwd(), "dev.db");
const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: `file:${dbPath}` }),
});

async function main() {
  const pw = await bcrypt.hash("demo1234", 12);

  // 1. 교수
  const prof = await prisma.professor.create({
    data: { name: "교수A", email: "profA@example.ac.kr", password: pw },
  });

  // 2. 강의
  const course = await prisma.course.create({
    data: {
      name: "데이터분석 [A]",
      semester: "2026-1",
      category: "컴퓨터과학",
      studentCount: 30,
      eclassId: 12345,  // e-class URL의 id= 값
      hasAssignment: true,   // 과제 있음 → 레이더 차트 "과제 적절성" 축 추가
      hasPractice: false,    // 실습 없음 → 레이더 차트 5각형
      professorId: prof.id,
    },
  });

  // 3. 학생 (크롬 확장 사용 시 자동 등록되므로 생략 가능)
  const student = await prisma.student.upsert({
    where: { studentNo: "0000001" },
    update: {},
    create: { studentNo: "0000001", name: "학생A" },
  });

  // 4. 수강 등록 + 토큰 (크롬 확장 사용 시 자동)
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

  // 5. 평가 라운드 (대시보드에서도 관리 가능, startDate/endDate로 자동 active)
  const now = new Date();
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  for (let week = 1; week <= 6; week++) {
    const isCurrent = week === 6;
    const startDate = isCurrent
      ? new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() - (6 - week + 1) * WEEK_MS);
    const endDate = isCurrent
      ? new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() - (6 - week) * WEEK_MS);
    await prisma.feedbackRound.create({
      data: { courseId: course.id, week, label: `${week}주차`, startDate, endDate },
    });
  }

  console.log("등록 완료!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
```

---

## 4. 크롬 확장 사용 시 자동 등록되는 것

| 항목 | 수동 등록 필요 | 자동 등록 |
|------|:-:|:-:|
| Professor | O | - |
| Course (eclassId 포함) | O | - |
| FeedbackRound | O (또는 대시보드 UI) | - |
| Student | - | O (e-class 프로필에서 추출) |
| CourseStudent | - | O (e-class 수강과목에서 추출) |
| StudentCourseToken | - | O (동기화 시 자동 발급) |

**즉, 교수/강의/라운드만 수동으로 등록하면 나머지는 크롬 확장이 알아서 처리합니다.**

---

## 5. DB 직접 확인

```bash
# Prisma Studio (GUI)
npx prisma studio

# 또는 SQLite CLI
sqlite3 dev.db ".tables"
sqlite3 dev.db "SELECT * FROM Student;"
```
