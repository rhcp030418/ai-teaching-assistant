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
      if (requiresAuth) {
        if (!config.apiKey) {
          throw new Error(`${providerName} API key가 설정되지 않았습니다 (AI_API_KEY).`);
        }
        headers["Authorization"] = `Bearer ${config.apiKey}`;
      }

      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages,
          ...(config.temperature !== undefined && { temperature: config.temperature }),
          ...(config.maxTokens !== undefined && { max_tokens: config.maxTokens }),
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`${providerName} API error: ${res.status} ${err}`);
      }

      const data = await res.json() as { choices?: { message?: { content?: string } }[] };
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error(`${providerName} API 응답 구조가 올바르지 않습니다.`);
      return {
        content,
        provider: providerName,
      };
    },
  };
}
