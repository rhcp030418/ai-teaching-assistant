# AI 프로바이더 설정 가이드

이 프로젝트의 AI 기능(코멘트 필터링, 원인 분석, 톤 보정 등)을 사용하려면 AI 프로바이더를 설정해야 합니다.

**API vs 로컬, 어떤 걸 선택해야 하나요?** 아래 판단 기준을 참고하세요.

---

## 어떤 방식을 쓸지 결정하기

### 내 컴퓨터에서 로컬 AI를 돌릴 수 있나?

| 조건 | 로컬 AI (Ollama) | 클라우드 API |
|------|:-:|:-:|
| **GPU** | NVIDIA 8GB+ VRAM 또는 Apple Silicon (M1 이상) | GPU 없어도 됨 |
| **RAM** | 16GB 이상 권장 | 상관없음 |
| **디스크** | 모델당 4~20GB 여유 공간 | 상관없음 |
| **인터넷** | 최초 모델 다운로드 시만 필요 | 항상 필요 |
| **비용** | 무료 | API 호출당 과금 (소량이면 거의 무료) |
| **속도** | GPU 사양에 따라 다름 | 보통 빠름 (1~5초) |
| **품질** | 모델에 따라 다름 | 일반적으로 높음 |

### 추천 정리

- **GPU 좋은 데스크톱** (RTX 3060 이상, VRAM 8GB+) → **Ollama 추천** (무료, 오프라인 가능)
- **맥북 M1/M2/M3/M4** → **Ollama 추천** (Apple Silicon 최적화 잘 되어있음)
- **노트북 (내장 그래픽)** → **클라우드 API 추천** (로컬은 너무 느림)
- **빠르게 테스트만** → **Gemini API 추천** (무료 티어 넉넉함)

---

## 방법 A: 클라우드 API (권장 — 설정 쉬움)

`.env` 파일을 열고 아래 중 하나를 선택해서 수정하세요.

### A-1. Google Gemini (무료 티어 있음, 입문 추천)

```env
AI_PROVIDER="gemini"
AI_API_KEY="여기에_API_키_입력"
AI_BASE_URL=""
AI_MODEL=""
```

1. https://aistudio.google.com 접속
2. Google 계정 로그인
3. 좌측 메뉴 "Get API key" → "Create API Key" 클릭
4. 생성된 키(`AIza...`)를 `AI_API_KEY`에 붙여넣기

> 무료 티어: 분당 15회, 일 1500회 — 테스트/데모에 충분합니다.

### A-2. OpenAI

```env
AI_PROVIDER="openai"
AI_API_KEY="여기에_API_키_입력"
AI_BASE_URL=""
AI_MODEL=""
```

1. https://platform.openai.com 접속
2. 로그인 → API Keys → "Create new secret key"
3. 생성된 키(`sk-...`)를 `AI_API_KEY`에 붙여넣기

> 선불 충전 필요. $5 정도면 데모에 충분합니다.

### A-3. Anthropic Claude

```env
AI_PROVIDER="claude"
AI_API_KEY="여기에_API_키_입력"
AI_BASE_URL=""
AI_MODEL=""
```

1. https://console.anthropic.com 접속
2. 로그인 → API Keys → "Create Key"
3. 생성된 키(`sk-ant-...`)를 `AI_API_KEY`에 붙여넣기

> 선불 충전 필요.

### A-4. xAI Grok

```env
AI_PROVIDER="grok"
AI_API_KEY="여기에_API_키_입력"
AI_BASE_URL=""
AI_MODEL=""
```

### A-5. NVIDIA NIM (OpenAI 호환 — 고성능 오픈소스 모델)

NVIDIA가 호스팅하는 LLM API. 무료 크레딧 제공, OpenAI 호환 방식으로 사용.

```env
AI_PROVIDER="openai"
AI_API_KEY="nvapi-여기에_API_키_입력"
AI_BASE_URL="https://integrate.api.nvidia.com/v1"
AI_MODEL="google/gemma-3-27b-it"
```

1. https://build.nvidia.com 접속 → Sign in
2. 원하는 모델 선택 (예: `google/gemma-3-27b-it`, `meta/llama-3.3-70b-instruct`)
3. "Get API Key" 클릭 → `nvapi-...` 형태의 키 발급
4. `AI_API_KEY`에 붙여넣기 (`Bearer` 접두사 없이)

> 모델이 DEGRADED 상태면 해당 모델은 일시적으로 사용 불가 (NVIDIA 서버 문제). 다른 모델로 변경하거나 복구 대기.

---

## 방법 B: 로컬 AI (Ollama — 무료, 오프라인)

인터넷 없이도 AI 기능을 쓸 수 있습니다.

### 1단계: Ollama 설치

- **Windows**: https://ollama.com/download/windows 에서 설치 파일 다운로드
- **Mac**: `brew install ollama` 또는 https://ollama.com/download/mac
- **Linux**: `curl -fsSL https://ollama.com/install.sh | sh`

설치 확인:
```bash
ollama --version
```

### 2단계: 모델 다운로드

내 컴퓨터 사양에 맞는 모델을 선택하세요.

| 모델 | 크기 | VRAM 필요 | 품질 | 추천 대상 |
|------|------|-----------|------|-----------|
| `gemma3:4b` | ~3GB | 4GB+ | 보통 | 저사양, 빠른 테스트 |
| `gemma3:12b` | ~8GB | 8GB+ | 좋음 | 중간 사양 |
| `gemma3:27b` | ~17GB | 16GB+ | 매우 좋음 | 고사양 GPU |
| `llama3` | ~4.7GB | 6GB+ | 좋음 | 범용 |
| `llama3:70b` | ~40GB | 48GB+ | 최상 | 고급 워크스테이션 |

```bash
# 예시: 중간 사양이면
ollama pull gemma3:12b

# 저사양이면
ollama pull gemma3:4b
```

> 다운로드에 시간이 걸립니다 (모델 크기에 따라 수 분~수십 분).

### 3단계: .env 수정

```env
AI_PROVIDER="ollama"
AI_API_KEY=""
AI_BASE_URL="http://localhost:11434/v1"
AI_MODEL="gemma3:12b"
```

`AI_MODEL`은 2단계에서 다운받은 모델명과 일치시키세요.

### 4단계: Ollama 실행 확인

```bash
ollama list
```

다운받은 모델이 목록에 보이면 준비 완료입니다. Ollama는 백그라운드 서비스로 자동 실행됩니다.

> **참고**: LM Studio 등 다른 로컬 AI도 OpenAI 호환 API를 제공하면 동일하게 사용 가능합니다. `AI_BASE_URL`만 해당 서버 주소로 변경하세요.

---

## 설정 확인 방법

1. 서버 실행: `npm run dev`
2. http://localhost:3000 접속 → 로그인 (`kim@hansung.ac.kr` / `demo1234`)
3. 아무 강의 클릭 → "심층 분석" 탭 → "원인 연결 분석"의 [분석 실행] 버튼 클릭
   (또는 우측 하단 AI 채팅 플로팅 버튼으로 질문해도 됩니다)
4. AI 응답이 오면 설정 완료!

### 안 되면 체크리스트

- [ ] `.env` 파일에 `AI_PROVIDER` 값이 올바른가?
- [ ] API 키가 따옴표 안에 정확히 들어갔나? (앞뒤 공백 없이)
- [ ] Ollama 사용 시: `ollama list`에 모델이 보이는가?
- [ ] Ollama 사용 시: `AI_BASE_URL`이 `http://localhost:11434/v1`인가?
- [ ] 서버를 재시작했는가? (`.env` 변경 후 반드시 재시작)
