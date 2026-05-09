import { AIConfig, AIProvider } from "./types";

export function getAIConfig(): AIConfig {
  const provider = (process.env.AI_PROVIDER || "openai") as AIProvider;
  const apiKey = process.env.AI_API_KEY || undefined;
  const baseUrl = process.env.AI_BASE_URL || undefined;
  const model = process.env.AI_MODEL || undefined;

  return { provider, apiKey, baseUrl, model };
}
