// ─── Rule-based profanity/abuse filter ───
// Blocks obviously abusive comments at submission time.
// Not exhaustive — AI filter on dashboard handles nuanced cases.
//
// 설계 원칙: 강의평가 플랫폼이므로 "정상적인(설령 부정적이라도) 피드백"은
// 절대 막지 않는다. 일상어와 겹치는 표현은 욕설 형태일 때만 잡도록 좁힌다.
//   예) 죽여버려(O 차단) vs 죽을 만큼/죽여주는(X 통과)
//       닥쳐!(O 차단)   vs 마감이 닥쳐와서(X 통과)
//       무능한 교수(O 차단) vs 직무능력(X 통과)

// 우회용 장식 문자(특수기호)를 제거해 핵심 표현을 노출시킨다.
// 예: "병.신", "ㅅ_ㅂ", "좆~같" → 매칭 가능.
// 공백/숫자는 정상 문장에서 오탐("다시 발표", "직무 능력")을 유발하므로 제거하지 않는다.
const DECORATION = /[.,_\-=+*~^·•/\\|<>"'`[\]{}()]/g;

function normalize(text: string): string {
  return text.toLowerCase().replace(DECORATION, "");
}

const BLOCKED_PATTERNS: RegExp[] = [
  // ─ 시발/씨발 계열 ─
  /씨[바빠발벌팔]/,
  /시[바빠]ㄹ/,
  /시[바빠][ㄹㄴ랄]/,
  /시발(?!점)/, // "시발점"(始發點) 오탐 방지
  /[시씨]부[럴랄]/,
  /십[팔빨]/,
  /[슈쉬쒸][발벌붕]/,
  /ㅅㅂ/,
  /ㅆㅂ/,
  /ㅄ/,

  // ─ 새끼/색끼 계열 ─
  /새끼(?![손발])/, // "새끼손가락/새끼발가락" 제외
  /색끼/,
  /쉐끼/,
  /ㅅㄲ/,

  // ─ 병신 계열 ─
  /(?<![발지유])병[신싄]/, // "발병/지병/유병 + 신고" 제외
  /[븅빙]신/,
  /ㅂㅅ/,

  // ─ 멍청이/머저리 계열 ─
  /머저리/,
  /무뇌/,
  /빡대가리/,
  /멍[청쳥]/,
  /꼴통/,
  /꼴값/,

  // ─ 미친/또라이/지랄/찐따 ─
  /미친[놈넘년것새]/, // 단독 "미친"은 슬랭 긍정("미친 강의력")이라 제외
  /ㅁㅊ/,
  /또[라랄]이/,
  /돌+아이/,
  /찐따/,
  /찌[질찔]/,
  /지[랄럴랠]/,
  /ㅈㄹ/,

  // ─ 좆/욕설성 ─
  /좆/,
  /좇/,
  /좆같/,
  /좆나/,
  /조까/,
  /개새/,
  /개소리/,
  /개차반/,
  /엿[먹같]/,
  /[쳐처]먹/,
  /(?<!들이)닥[쳐처](?![오와온올])/, // "들이닥쳐 / 닥쳐와·온"(엄습) 제외, "닥쳐!" 차단
  /ㄷㅊ/,
  /ㄲㅈ/,

  // ─ 비하/모욕 (교수 대상) ─
  /무능(력)?[한해하함]/, // "직무능력" 등 정상 합성어 제외, "무능한/무능력한"만 차단
  /자격\s*없/,
  /자질\s*없/,
  /자질\s*미달/,
  /짤[려라]/,

  // ─ 위협 ─
  /죽여\s*버/, // 죽여버려 (죽을 만큼/죽여주는 은 통과)
  /죽일[놈년]/,
  /때려\s*죽/, // 때려죽일 (때려치우다 는 통과)
  /패\s*죽/,
  /패\s*버[려릴]/,
  /뒈[져저]/,
  /가만\s*안\s*[두둬]/,
];

const WARNED_PATTERNS: RegExp[] = [
  // 감정적이지만 차단까지는 아닌 표현 (재확인 후 제출 허용).
  // 정당한 비판 어휘(무성의·불성실·무책임 등)는 자유롭게 쓰도록 포함하지 않는다.
  /최악/,
  /쓰레기/,
  /돈\s*아깝/,
  /시간\s*낭비/,
  /왜\s*교수/,
  /노답/,
  /극혐/,
  /역겨[워운]/,
  /토나[와온올]/,
  /꼰대/,
  /갑질/,
  /수준\s*미달/,
  /함량\s*미달/,
  /한심/,
  /개\s*못\s*(함|해|하|한|했)/,

  // 강조 슬랭은 건설적인 피드백에도 붙을 수 있어 하드 차단하지 않고 재확인만 요청한다.
  /존나/,
  /졸라/,
  /ㅈㄴ/,
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

  const text = normalize(comment);

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      return {
        blocked: true,
        warned: false,
        reason: "학습 경험을 전달하기 어려운 표현이 포함되어 있습니다. 내용을 조금 더 부드럽게 바꿔주세요.",
      };
    }
  }

  for (const pattern of WARNED_PATTERNS) {
    if (pattern.test(text)) {
      return {
        blocked: false,
        warned: true,
        reason: "더 정확한 분석을 위해 표현을 한 번 다듬어 주세요. 원하면 이대로 제출할 수도 있습니다.",
      };
    }
  }

  return { blocked: false, warned: false, reason: null };
}
