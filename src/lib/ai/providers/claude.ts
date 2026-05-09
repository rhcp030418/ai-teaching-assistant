import { AIConfig, AIMessage, AIProviderAdapter, AIResponse } from "../types";

export const claudeAdapter: AIProviderAdapter = {
  async chat(messages: AIMessage[], config: AIConfig): Promise<AIResponse> {
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
        "x-api-key": config.apiKey!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: systemMsg?.content,
        messages: chatMessages,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Claude API error: ${res.status} ${err}`);
    }

    const data = await res.json();
    return {
      content: data.content[0].text,
      provider: "claude",
    };
  },
};
