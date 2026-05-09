"use server";

import path from "node:path";
import fs from "node:fs/promises";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { chatWithAI } from "@/lib/ai";
import { parseAIJson } from "@/lib/parse-ai-json";

export interface MaterialAnalysis {
  summary: string;
  difficulty: string;
  difficultyReason: string;
  termDensity: string;
  termExamples: string[];
  exampleSufficiency: string;
  exampleFeedback: string;
  improvements: string[];
}

/**
 * Extract text from PDF. If text-based extraction yields very little text
 * (likely a scanned/image PDF), fall back to OCR via tesseract.js.
 */
async function extractPdfText(fullPath: string): Promise<string> {
  const buffer = await fs.readFile(fullPath);

  // Try text-based extraction via unpdf
  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const doc = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(doc, { mergePages: true });
    if (text && text.trim().length > 50) {
      return text.trim();
    }
  } catch {
    // fall through to OCR
  }

  // Likely a scanned/image PDF — use OCR
  return await ocrFromPdfBuffer(buffer);
}

/**
 * OCR fallback for scanned PDFs using tesseract.js.
 * Converts PDF pages to images via unpdf, then runs OCR.
 */
async function ocrFromPdfBuffer(buffer: Buffer): Promise<string> {
  const { renderPageAsImage, getDocumentProxy } = await import("unpdf");
  const { createWorker } = await import("tesseract.js");

  const doc = await getDocumentProxy(new Uint8Array(buffer));
  const pageCount = doc.numPages;
  const maxPages = Math.min(pageCount, 20); // Limit to 20 pages

  const worker = await createWorker("kor+eng");
  const texts: string[] = [];

  for (let i = 1; i <= maxPages; i++) {
    try {
      const imageResult = await renderPageAsImage(doc, i, {
        width: 1200,
      });
      // imageResult is a Uint8Array PNG
      const imageBuffer = Buffer.from(imageResult);
      const { data } = await worker.recognize(imageBuffer);
      if (data.text?.trim()) {
        texts.push(data.text.trim());
      }
    } catch {
      // Skip pages that fail to render
    }
  }

  await worker.terminate();
  return texts.join("\n\n");
}

async function extractText(filePath: string): Promise<string> {
  const fullPath = path.join(process.cwd(), "uploads", filePath);
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".txt") {
    return await fs.readFile(fullPath, "utf-8");
  }

  if (ext === ".pdf") {
    return await extractPdfText(fullPath);
  }

  return "[PPT 파일은 텍스트 추출이 제한적입니다. PDF 변환 후 업로드를 권장합니다.]";
}

export async function analyzeMaterial(materialId: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "인증 필요" };

  const material = await prisma.lectureMaterial.findUnique({
    where: { id: materialId },
    include: { course: { select: { professorId: true } } },
  });

  if (!material) {
    return { success: false, error: "자료를 찾을 수 없습니다." };
  }

  if (material.course.professorId !== session.user.id) {
    return { success: false, error: "권한이 없습니다." };
  }

  if (material.analysis) {
    return { success: true, analysis: JSON.parse(material.analysis) };
  }

  let text: string;
  try {
    text = await extractText(material.filePath);
  } catch {
    return { success: false, error: "파일 텍스트 추출에 실패했습니다." };
  }

  if (!text || text.length < 10) {
    return {
      success: false,
      error:
        "추출된 텍스트가 너무 짧습니다. 스캔 품질이 낮거나 이미지만 있는 파일일 수 있습니다.",
    };
  }

  const truncated = text.slice(0, 8000);

  try {
    const response = await chatWithAI([
      {
        role: "system",
        content: `당신은 대학 강의자료 분석 전문가입니다. 아래 강의자료 텍스트를 분석하여 반드시 다음 JSON 형식으로만 응답하세요. JSON 외의 텍스트는 포함하지 마세요.

{
  "summary": "핵심 내용 3~5문장 요약",
  "difficulty": "상/중/하",
  "difficultyReason": "난이도 판단 근거 1~2문장",
  "termDensity": "높음/보통/낮음",
  "termExamples": ["전문 용어 예시 최대 5개"],
  "exampleSufficiency": "충분/보통/부족",
  "exampleFeedback": "예시 관련 피드백 1~2문장",
  "improvements": ["개선 제안 최대 3개"]
}`,
      },
      {
        role: "user",
        content: `다음 강의자료를 분석해주세요:\n\n${truncated}`,
      },
    ]);

    let analysis: MaterialAnalysis;
    try {
      analysis = parseAIJson<MaterialAnalysis>(response.content);
    } catch {
      return { success: false, error: "AI 응답을 파싱할 수 없습니다." };
    }

    await prisma.lectureMaterial.update({
      where: { id: materialId },
      data: { analysis: JSON.stringify(analysis) },
    });

    return { success: true, analysis };
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI 분석 실패";
    return { success: false, error: message };
  }
}
