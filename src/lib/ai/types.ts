export type AIProvider = "openai" | "gemini" | "claude" | "grok" | "ollama";

export interface AIConfig {
  provider: AIProvider;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIResponse {
  content: string;
  provider: AIProvider;
}

export interface AIProviderAdapter {
  chat(messages: AIMessage[], config: AIConfig): Promise<AIResponse>;
}
