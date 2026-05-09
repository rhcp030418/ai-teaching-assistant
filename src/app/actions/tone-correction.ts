"use server";

import { chatWithAI } from "@/lib/ai";
import { parseAIJson } from "@/lib/parse-ai-json";

export interface ToneResult {
  issues: { original: string; reason: string; suggestion: string }[];
  corrected: string;
  overallTone: string;
}

export async function correctTone(text: string) {
  if (!text || text.trim().length < 5) {
    return { success: false, error: "텍스트를 입력해주세요." };
  }

  try {
    const response = await chatWithAI([
      {
        role: "system",
        content: `당신은 대학 교수의 학생 대상 커뮤니케이션 보조 전문가입니다.
교수가 작성한 공지, 이메일, 메시지를 분석하여 다음을 수행합니다:

1. 권위적·강압적·위협적 표현을 감지합니다.
2. 학생이 기분 나빠할 수 있는 표현을 부드럽고 명확하게 수정합니다.
3. 원래 의도와 정보는 그대로 유지합니다.

반드시 다음 JSON 형식으로만 응답하세요:

{
  "issues": [
    {
      "original": "개선이 필요한 원문 표현",
      "reason": "개선이 필요한 이유 간단 설명",
      "suggestion": "수정 제안"
    }
  ],
  "corrected": "전체 수정된 텍스트",
  "overallTone": "원문의 전체 톤 평가 (예: 다소 강압적, 적절함, 매우 권위적 등)"
}`,
      },
      {
        role: "user",
        content: `다음 텍스트의 톤을 분석하고 보정해주세요:\n\n${text}`,
      },
    ]);

    let result: ToneResult;
    try {
      result = parseAIJson<ToneResult>(response.content);
    } catch {
      return { success: false, error: "AI 응답을 파싱할 수 없습니다." };
    }

    return { success: true, result };
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI 분석 실패";
    return { success: false, error: message };
  }
}
