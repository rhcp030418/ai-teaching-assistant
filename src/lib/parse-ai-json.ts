export function parseAIJson<T>(content: string): T {
  // Try 1: fenced code block (```json ... ```)
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    return JSON.parse(fenced[1].trim()) as T;
  }

  // Try 2: extract outermost JSON structure from surrounding prose
  const objStart = content.indexOf("{");
  const objEnd = content.lastIndexOf("}");
  const arrStart = content.indexOf("[");
  const arrEnd = content.lastIndexOf("]");

  const hasObj = objStart !== -1 && objEnd > objStart;
  const hasArr = arrStart !== -1 && arrEnd > arrStart;

  if (hasArr && (!hasObj || arrStart < objStart)) {
    return JSON.parse(content.slice(arrStart, arrEnd + 1)) as T;
  }
  if (hasObj) {
    return JSON.parse(content.slice(objStart, objEnd + 1)) as T;
  }

  return JSON.parse(content.trim()) as T;
}
