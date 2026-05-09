import { createOpenAICompatibleAdapter } from "./openai-compatible";

export const openaiAdapter = createOpenAICompatibleAdapter(
  "https://api.openai.com/v1",
  "gpt-4o",
  "openai"
);
