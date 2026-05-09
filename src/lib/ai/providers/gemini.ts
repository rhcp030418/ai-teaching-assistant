import { AIConfig, AIMessage, AIProviderAdapter, AIResponse } from "../types";

export const geminiAdapter: AIProviderAdapter = {
  async chat(messages: AIMessage[], config: AIConfig): Promise<AIResponse> {
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
    return {
      content: data.candidates[0].content.parts[0].text,
      provider: "gemini",
    };
  },
};
