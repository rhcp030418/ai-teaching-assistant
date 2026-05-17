import { AIConfig, AIMessage, AIProviderAdapter, AIResponse } from "../types";

export const geminiAdapter: AIProviderAdapter = {
  async chat(messages: AIMessage[], config: AIConfig): Promise<AIResponse> {
    if (!config.apiKey) {
      throw new Error("Gemini API 키가 설정되지 않았습니다. .env에 AI_API_KEY를 설정해주세요.");
    }

    const model = config.model || "gemini-2.5-flash";
    const baseUrl =
      config.baseUrl ||
      `https://generativelanguage.googleapis.com/v1beta/models/${model}`;

    const systemMsg = messages.find((m) => m.role === "system");
    const chatMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const res = await fetch(
      `${baseUrl}:generateContent?key=${config.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(systemMsg && {
            systemInstruction: { parts: [{ text: systemMsg.content }] },
          }),
          contents: chatMessages,
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini API error: ${res.status} ${err}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Gemini API 응답이 올바르지 않습니다. 콘텐츠가 필터링되었거나 응답이 비어있습니다.");
    }
    return {
      content: text,
      provider: "gemini",
    };
  },
};
