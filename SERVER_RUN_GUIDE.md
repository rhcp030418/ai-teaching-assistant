# 서버 실행 가이드

## 사전 준비

- **Node.js** 18 이상 설치 필요 (권장: 20+)
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

`.env` 파일이 프로젝트 루트에 이미 있습니다. AI API 키만 넣으면 됩니다.

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

> `.env` 파일이 없거나 새로 만들어야 할 경우, 위 내용을 복사해서 프로젝트 루트에 `.env` 파일로 저장하세요.

### 3. DB 초기화

```bash
npx prisma generate
npx prisma migrate dev
```

> 최초 실행 시에만 필요합니다. 프로젝트 루트에 `dev.db` 파일이 자동 생성됩니다.

### 4. 데모 데이터 세팅 (권장)

```bash
npx tsx prisma/seed.ts
```

생성되는 데이터:
- 교수 12명 (전체 비밀번호: `demo1234`)
- 강의 30개 (3학기, 4카테고리)
- 피드백 623건
- 개선 사례 4건 (벤치마크 비교용)
- 학생 10명, 수강 등록 20건, 학생 토큰 20개, 평가 라운드 14개 (인공지능 개론 8주차 + 데이터베이스 6주차)

메인 데모 계정: `kim@hansung.ac.kr` / `demo1234`

> `npx tsx`가 처음이면 자동 다운로드됩니다. 시간이 걸릴 수 있습니다.

### 5. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 으로 접속합니다.

### 6. 프로덕션 빌드 (선택)

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
rm dev.db
npx prisma migrate dev
npx tsx prisma/seed.ts
```

### 포트 충돌 시
```bash
npm run dev -- --port 3001
```

### 로그인이 안 될 때
- `.env`에 `AUTH_SECRET` 값이 있는지 확인
- 시드를 다시 실행: `npx tsx prisma/seed.ts`
- 브라우저 쿠키 삭제 후 재시도
