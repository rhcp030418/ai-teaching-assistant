export function parseAIJson<T>(content: string): T {
  let jsonStr = content;
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  }
  return JSON.parse(jsonStr.trim()) as T;
}
