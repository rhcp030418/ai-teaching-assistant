import { AIConfig, AIMessage, AIProvider, AIProviderAdapter, AIResponse } from "./types";
import { getAIConfig } from "./config";
import { openaiAdapter } from "./providers/openai";
import { claudeAdapter } from "./providers/claude";
import { geminiAdapter } from "./providers/gemini";
import { grokAdapter } from "./providers/grok";
import { ollamaAdapter } from "./providers/ollama";

const adapters: Record<AIProvider, AIProviderAdapter> = {
  openai: openaiAdapter,
  claude: claudeAdapter,
  gemini: geminiAdapter,
  grok: grokAdapter,
  ollama: ollamaAdapter,
};

/**
 * Send messages to the AI provider configured in .env
 * Optionally override config for specific calls.
 */
export async function chatWithAI(
  messages: AIMessage[],
  configOverride?: Partial<AIConfig>
): Promise<AIResponse> {
  const config = { ...getAIConfig(), ...configOverride };
  const adapter = adapters[config.provider];
  if (!adapter) {
    throw new Error(`Unknown AI provider: ${config.provider}`);
  }
  return adapter.chat(messages, config);
}

export { type AIConfig, type AIMessage, type AIProvider, type AIResponse };
