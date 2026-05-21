import path from "node:path";
import fs from "node:fs/promises";
import { OCR_MAX_PAGES, OCR_TIMEOUT_MS, CHUNK_MAX_CHARS } from "@/lib/constants";
import { UPLOADS_DIR } from "@/lib/uploads";

async function extractPdfText(fullPath: string): Promise<string> {
  const buffer = await fs.readFile(fullPath);

  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const doc = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(doc, { mergePages: true });
    if (text && text.trim().length > 50) return text.trim();
  } catch {
    // fall through to OCR
  }

  return ocrFromPdfBuffer(buffer);
}

async function ocrFromPdfBuffer(buffer: Buffer): Promise<string> {
  const { renderPageAsImage, getDocumentProxy } = await import("unpdf");
  const { createWorker } = await import("tesseract.js");

  const doc = await getDocumentProxy(new Uint8Array(buffer));
  const maxPages = Math.min(doc.numPages, OCR_MAX_PAGES);
  const worker = await createWorker("kor+eng");
  const texts: string[] = [];
  let aborted = false;

  try {
    await Promise.race([
      (async () => {
        for (let i = 1; i <= maxPages; i++) {
          if (aborted) break;
          try {
            const imageResult = await renderPageAsImage(doc, i, { width: 1200 });
            const { data } = await worker.recognize(Buffer.from(imageResult));
            if (data.text?.trim()) texts.push(data.text.trim());
          } catch {
            // skip failed page, continue
          }
        }
      })(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), OCR_TIMEOUT_MS)
      ),
    ]);
  } catch (err) {
    if (!(err instanceof Error && err.message === "timeout")) throw err;
    aborted = true;
  } finally {
    await worker.terminate().catch(() => {});
  }

  return texts.join("\n\n");
}

export async function extractFileText(filePath: string): Promise<string> {
  const fullPath = path.join(UPLOADS_DIR, filePath);
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".txt") return fs.readFile(fullPath, "utf-8");
  if (ext === ".pdf") return extractPdfText(fullPath);
  return "";
}

function snapToBoundary(text: string, pos: number, lookBack: boolean): number {
  const searchWindow = 200;
  if (lookBack) {
    const chunk = text.slice(Math.max(0, pos - searchWindow), pos);
    const nl = chunk.lastIndexOf("\n");
    return nl >= 0 ? pos - (chunk.length - nl) : pos;
  } else {
    const chunk = text.slice(pos, Math.min(text.length, pos + searchWindow));
    const nl = chunk.indexOf("\n");
    return nl >= 0 ? pos + nl + 1 : pos;
  }
}

export function smartChunk(text: string, maxChars = CHUNK_MAX_CHARS): string {
  if (text.length <= maxChars) return text;

  // 한계치 20% 이내 소폭 초과: 경계 스냅 후 단순 절단
  if (text.length <= Math.floor(maxChars * 1.2)) {
    return text.slice(0, snapToBoundary(text, maxChars, true));
  }

  const frontSize = 3000;
  const midSize = 2500;
  const endSize = 2500;

  const frontEnd = snapToBoundary(text, frontSize, true);

  const midCenter = Math.floor(text.length / 2);
  const rawMidStart = Math.max(frontEnd, midCenter - Math.floor(midSize / 2));
  const midStart = snapToBoundary(text, rawMidStart, false);
  const midEnd = snapToBoundary(text, midStart + midSize, true);

  const rawEndStart = Math.max(midEnd, text.length - endSize);
  const endStart = snapToBoundary(text, rawEndStart, false);

  const parts = [text.slice(0, frontEnd)];
  if (midStart > frontEnd) parts.push(`\n\n...[중략]...\n\n${text.slice(midStart, midEnd)}`);
  if (endStart > midEnd) parts.push(`\n\n...[중략]...\n\n${text.slice(endStart)}`);

  return parts.join("");
}
