// ─── Rule-based profanity/abuse filter ───
// Blocks obviously abusive comments at submission time.
// Not exhaustive — AI filter on dashboard handles nuanced cases.

const BLOCKED_PATTERNS: RegExp[] = [
  // 욕설/비속어
  /시[바빠][ㄹㄴ랄]/,
  /씨[바빠발]/,
  /ㅅㅂ/,
  /ㅂㅅ/,
  /ㅄ/,
  /개새/,
  /병[신싄]/,
  /ㅂㅇ/,
  /지[랄랠]/,
  /좆/,
  /꺼[져저]/,
  /닥[쳐처]/,
  /미친[놈년]/,
  /또[라라]이/,
  /찐[따따]/,
  /멍[청쳥]/,
  // 비하/모욕
  /무능/,
  /자격\s*없/,
  /짤려야/,
  /해고/,
  /쫓겨나/,
  // 위협
  /죽[여어을]/,
  /때[려릴린]/,
  /패[버줄]/,
];

const WARNED_PATTERNS: RegExp[] = [
  // 감정적이지만 차단까지는 아닌 표현
  /최악/,
  /쓰레기/,
  /돈\s*아깝/,
  /시간\s*낭비/,
  /왜\s*교수/,
];

export interface FilterResult {
  blocked: boolean;
  warned: boolean;
  reason: string | null;
}

export function filterComment(comment: string): FilterResult {
  if (!comment || comment.trim().length === 0) {
    return { blocked: false, warned: false, reason: null };
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(comment)) {
      return {
        blocked: true,
        warned: false,
        reason: "부적절한 표현이 포함되어 있습니다. 학습 경험 중심으로 작성해주세요.",
      };
    }
  }

  for (const pattern of WARNED_PATTERNS) {
    if (pattern.test(comment)) {
      return {
        blocked: false,
        warned: true,
        reason: "감정적 표현이 감지되었습니다. 이대로 제출하시겠습니까?",
      };
    }
  }

  return { blocked: false, warned: false, reason: null };
}
