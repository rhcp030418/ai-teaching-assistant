import { AIConfig, AIMessage, AIProvider, AIProviderAdapter, AIResponse } from "../types";

export function createOpenAICompatibleAdapter(
  defaultBaseUrl: string,
  defaultModel: string,
  providerName: AIProvider,
  requiresAuth: boolean = true
): AIProviderAdapter {
  return {
    async chat(messages: AIMessage[], config: AIConfig): Promise<AIResponse> {
      const baseUrl = config.baseUrl || defaultBaseUrl;
      const model = config.model || defaultModel;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (requiresAuth && config.apiKey) {
        headers["Authorization"] = `Bearer ${config.apiKey}`;
      }

      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({ model, messages }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`${providerName} API error: ${res.status} ${err}`);
      }

      const data = await res.json();
      return {
        content: data.choices[0].message.content,
        provider: providerName,
      };
    },
  };
}
