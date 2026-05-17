import { AIConfig, AIMessage, AIProviderAdapter, AIResponse } from "../types";

export const claudeAdapter: AIProviderAdapter = {
  async chat(messages: AIMessage[], config: AIConfig): Promise<AIResponse> {
    if (!config.apiKey) {
      throw new Error("Claude API key가 설정되지 않았습니다 (AI_API_KEY).");
    }

    const baseUrl = config.baseUrl || "https://api.anthropic.com/v1";
    const model = config.model || "claude-sonnet-4-6";

    const systemMsg = messages.find((m) => m.role === "system");
    const chatMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));

    const res = await fetch(`${baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: config.maxTokens ?? 4096,
        ...(config.temperature !== undefined && { temperature: config.temperature }),
        system: systemMsg?.content,
        messages: chatMessages,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Claude API error: ${res.status} ${err}`);
    }

    const data = await res.json() as { content?: { text?: string }[] };
    const text = data.content?.[0]?.text;
    if (!text) throw new Error("Claude API 응답 구조가 올바르지 않습니다.");

    return { content: text, provider: "claude" };
  },
};
