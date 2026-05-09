import { createOpenAICompatibleAdapter } from "./openai-compatible";

export const grokAdapter = createOpenAICompatibleAdapter(
  "https://api.x.ai/v1",
  "grok-3-mini",
  "grok"
);
