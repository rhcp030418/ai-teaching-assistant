import { chatWithAI } from "@/lib/ai";

export interface CommentClassification {
  category: "학습" | "감정" | "혼합";
  filtered: string | null; // 학습=원문 그대로, 감정=null, 혼합=순화 텍스트
  reason: string;
  hasProfanity: boolean;
}

export async function classifyComment(comment: string): Promise<CommentClassification> {
  const response = await chatWithAI([
    {
      role: "system",
      content: `당신은 대학 강의 피드백 필터링 전문가입니다. 학생 의견 하나를 분류하세요.

카테고리 기준:
- "학습": 수업 방식, 자료, 소통, 내용 등 학습 경험에 대한 건설적 피드백. 구어체(ㅎ, ㅋ, 솔직히 등)나 비공식 어투가 포함되어도 건설적이면 학습으로 분류하고 원문 그대로 통과시킵니다.
- "감정": 욕설·비속어(ㅈ같다, 개못함, 씨발 등), 인신공격, 교육적 내용이 전혀 없는 비건설적 불만. 교수에게 보여주지 않습니다(filtered=null).
- "혼합": 건설적 학습 내용이 있지만 욕설/비속어도 포함된 경우. filtered에 욕설을 제거한 순화 버전을 담습니다.

핵심 원칙: 좋은 피드백(건설적·구체적·솔직한)은 비공식 어투가 있어도 원문 그대로 교수에게 전달합니다. 욕설·비속어가 있을 때만 필터링하세요.

반드시 다음 JSON 형식으로만 응답하세요:
{
  "category": "학습 / 감정 / 혼합",
  "filtered": "학습이면 원문 그대로, 감정이면 null, 혼합이면 욕설만 제거한 버전",
  "reason": "분류 근거 한 문장",
  "hasProfanity": true 또는 false
}`,
    },
    {
      role: "user",
      content: comment,
    },
  ]);

  let jsonStr = response.content;
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  }

  let parsed: { category?: string; filtered?: string | null; reason?: string; hasProfanity?: boolean };
  try {
    parsed = JSON.parse(jsonStr.trim());
  } catch {
    return { category: "학습", filtered: comment, reason: "", hasProfanity: false };
  }

  const category = (parsed.category === "감정" || parsed.category === "혼합")
    ? parsed.category
    : "학습";

  return {
    category: category as CommentClassification["category"],
    filtered: category === "감정" ? null : (parsed.filtered ?? comment),
    reason: parsed.reason ?? "",
    hasProfanity: parsed.hasProfanity === true,
  };
}
