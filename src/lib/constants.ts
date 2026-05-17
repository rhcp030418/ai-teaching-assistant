// 피드백 최소 건수 (분석 가능 기준)
export const FEEDBACK_MIN_COUNT = 3;

// 지표 기준선
export const COMM_AVG_THRESHOLD = 3.5;
export const SPEED_MODERATE_THRESHOLD = 50;
export const COMP_HIGH_THRESHOLD = 50;

// AI 채팅 추천 질문 생성 시 이해도 임계값 (기준선과 별도)
export const CHAT_COMP_SUGGESTION_THRESHOLD = 40;

// AI 프롬프트에 전달하는 코멘트 최대 수
export const MAX_COMMENTS_IN_ANALYSIS = 20;
export const MAX_COMMENTS_IN_ROADMAP = 15;

// OCR
export const OCR_MAX_PAGES = 20;
export const OCR_TIMEOUT_MS = 120_000;

// 텍스트 청킹
export const CHUNK_MAX_CHARS = 8_000;

// 백그라운드 코멘트 분류 큐
export const CLASSIFY_TIMEOUT_MS = 30_000;
export const CLASSIFY_MAX_QUEUE_SIZE = 100;
