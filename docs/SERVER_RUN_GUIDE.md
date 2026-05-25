# 서버 실행 가이드

## 사전 준비

- **Node.js** 20.9 이상 설치 필요 (`package.json`의 `engines`에 `>=20.9.0` 명시)
  - https://nodejs.org 에서 다운로드
  - npm 포함 (Node.js 설치 시 자동 포함)
- **Git** (프로젝트 클론 시)

설치 확인:
```bash
node -v
npm -v
```

## 설치 및 실행

### 1. 의존성 설치

```bash
cd ai-teaching-assistant
npm install
```

### 2. 환경 변수 설정

`.env.example` 을 복사해 `.env` 를 만든 뒤 값을 채웁니다.

```bash
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
```

```env
DATABASE_URL="file:./dev.db"

# AI Provider: openai | claude | gemini | grok | ollama
AI_PROVIDER="claude"
AI_API_KEY="여기에_API_키_입력"
AI_BASE_URL=""
AI_MODEL=""

# NextAuth
AUTH_SECRET="여기에_시크릿_입력"
```

**AUTH_SECRET 생성 방법:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
출력된 값을 `AUTH_SECRET`에 붙여넣으면 됩니다.

### 3. DB 초기화 + 초기 관리자 계정 (한 번에)

```bash
npm run setup
```

`prisma generate` → `prisma migrate deploy`(dev.db 생성) → 초기 관리자 계정 시드(`seed.ts`)를 한 번에 실행합니다. 최초 1회만 필요합니다.

> 개별 실행이 필요하면:
> ```bash
> npx prisma generate
> npx prisma migrate deploy
> npm run db:seed          # .env의 ADMIN_* 로 관리자 계정 생성
> ```

> `npx tsx`가 처음이면 자동 다운로드됩니다. 시간이 걸릴 수 있습니다.

생성되는 데이터:
- 교수(관리자) 계정 1개 — `.env` 의 `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` (기본 `admin@example.com` / `changeme1234`)

> **운영 전 `ADMIN_PASSWORD` 를 반드시 변경하세요.** 강의·학생은 로그인 후 `prisma/add-user.ts` 로 등록합니다([DB_GUIDE.md](./DB_GUIDE.md)).

#### (선택) 예시 데이터로 화면 채워 보기

```bash
npm run seed:example
```

관리자 계정 아래에 예시 강의 1개 + 종료된 평가 회차 2개 + 익명 피드백 16건을 만들어, 대시보드의 요약·차트·회차 리포트·추이 화면을 바로 확인할 수 있습니다. 실제 운영 데이터와 무관하므로 언제든 지워도 됩니다.

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 으로 접속합니다.

### 5. 프로덕션 빌드 (선택)

```bash
npm run build
npm start
```

## AI 프로바이더별 설정

### Claude (Anthropic)
```env
AI_PROVIDER="claude"
AI_API_KEY="sk-ant-..."
```
API 키 발급: https://console.anthropic.com

### OpenAI
```env
AI_PROVIDER="openai"
AI_API_KEY="sk-..."
```
API 키 발급: https://platform.openai.com

### Google Gemini
```env
AI_PROVIDER="gemini"
AI_API_KEY="AIza..."
```
API 키 발급: https://aistudio.google.com

### xAI Grok
```env
AI_PROVIDER="grok"
AI_API_KEY="xai-..."
```

### 로컬 AI (Ollama)
API 키 불필요. Ollama 설치 후:
```bash
ollama pull llama3
```
```env
AI_PROVIDER="ollama"
AI_BASE_URL="http://localhost:11434/v1"
```

> LM Studio도 OpenAI 호환 API를 제공하므로 동일하게 사용 가능합니다. base URL만 변경하면 됩니다.

## 문제 해결

### Prisma 관련 오류 시
```bash
npx prisma generate
```

### DB 초기화가 필요한 경우
```bash
rm dev.db          # Windows PowerShell: Remove-Item dev.db
npm run setup      # migrate + 관리자 계정 재생성
```

### 포트 충돌 시
```bash
npm run dev -- --port 3001
```

### 로그인이 안 될 때
- `.env`에 `AUTH_SECRET` 값이 있는지 확인
- 시드를 다시 실행: `npm run db:seed`
- 브라우저 쿠키 삭제 후 재시도
