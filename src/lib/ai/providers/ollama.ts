import { createOpenAICompatibleAdapter } from "./openai-compatible";

export const ollamaAdapter = createOpenAICompatibleAdapter(
  "http://localhost:11434/v1",
  "llama3",
  "ollama",
  false // no auth needed
);
