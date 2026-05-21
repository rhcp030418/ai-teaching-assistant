"use server";

import path from "node:path";
import { after } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { chatWithAI } from "@/lib/ai";
import { parseAIJson } from "@/lib/parse-ai-json";
import { computeFeedbackCounts } from "@/lib/feedback-stats";
import { extractFileText, smartChunk } from "@/lib/file-extraction";

export interface ImprovementDetail {
  structure: string | null;
  examples: string | null;
  pedagogy: string | null;
}

export interface MaterialAnalysis {
  summary: string;
  difficulty: string;
  difficultyReason: string;
  termDensity: string;
  termExamples: string[];
  exampleSufficiency: string;
  exampleFeedback: string;
  improvements: ImprovementDetail;
}

async function buildFeedbackContext(courseId: string, roundId?: string | null): Promise<string> {
  const feedbacks = await prisma.feedback.findMany({
    where: roundId ? { courseId, roundId } : { courseId },
    select: {
      speed: true,
      comprehension: true,
      communication: true,
      interest: true,
      assignment: true,
      practice: true,
      filteredComment: true,
      comment: true,
    },
  });

  if (feedbacks.length < 3) return "";

  const {
    total, speedCounts, compCounts, commSum,
    interestSum, interestCount,
    assignmentSum, assignmentCount,
    practiceSum, practiceCount,
  } = computeFeedbackCounts(feedbacks);

  const comments = feedbacks
    .map((fb) => fb.filteredComment ?? fb.comment)
    .filter((c): c is string => c != null);

  const pct = (n: number) => Math.round((n / total) * 100);
  const avg = (sum: number, count: number): string | null =>
    count > 0 ? (Math.round((sum / count) * 10) / 10).toFixed(1) : null;

  const header = roundId ? "[해당 주차 학생 피드백 현황" : "[학생 피드백 현황";
  const lines: string[] = [
    `${header} (${total}건)]`,
    `- 수업 속도: 빠름 ${pct(speedCounts.fast)}% / 적당 ${pct(speedCounts.moderate)}% / 느림 ${pct(speedCounts.slow)}%`,
    `- 자료 이해도: 높음 ${pct(compCounts.high)}% / 보통 ${pct(compCounts.medium)}% / 낮음 ${pct(compCounts.low)}%`,
    `- 소통 만족도: ${avg(commSum, total)}/5`,
  ];
  if (interestCount > 0) lines.push(`- 흥미도: ${avg(interestSum, interestCount)}/5`);
  if (assignmentCount > 0) lines.push(`- 과제 적절성: ${avg(assignmentSum, assignmentCount)}/5`);
  if (practiceCount > 0) lines.push(`- 실습/예시 충분도: ${avg(practiceSum, practiceCount)}/5`);
  if (comments.length > 0) lines.push(`- 학생 의견: ${comments.slice(0, 5).join(" / ")}`);
  lines.push("위 피드백을 참고하여 강의자료가 각 수치에 어떻게 연관되는지 분석에 반영하세요.");

  return `\n\n${lines.join("\n")}`;
}

const SYSTEM_PROMPT = `당신은 대학 강의자료 분석 전문가입니다. 아래 강의자료 텍스트를 분석하여 반드시 다음 JSON 형식으로만 응답하세요. JSON 외의 텍스트는 포함하지 마세요.
텍스트에 "[중략]" 표시가 있으면 문서 전체에서 균등하게 샘플링된 것입니다. 전체 흐름을 고려해 분석하세요.
학생 피드백 현황이 제공된 경우, 분석 결과(특히 difficultyReason, exampleFeedback, improvements)가 실제 학생 반응과 연결되도록 작성하세요.
"해당 주차 학생 피드백"이 제공된 경우, 그 주차 학생들의 반응을 우선적으로 반영하세요.

{
  "summary": "핵심 내용 3~5문장 요약 (강의 흐름과 주요 개념 포함)",
  "difficulty": "상/중/하",
  "difficultyReason": "난이도 판단 근거 — 학생 피드백 현황이 있으면 이해도 수치와 연결해 설명",
  "termDensity": "높음/보통/낮음",
  "termExamples": ["전문 용어 예시 최대 5개"],
  "exampleSufficiency": "충분/보통/부족",
  "exampleFeedback": "예시 관련 피드백 — 학생 실습/예시 충분도 점수가 있으면 연결해 설명",
  "improvements": {
    "structure": "자료 구조·흐름·순서 개선 제안 (해당 없으면 null)",
    "examples": "예시·실습·시각화 보강 제안 (해당 없으면 null)",
    "pedagogy": "설명 방식·강조점·개념 연결 개선 제안 (해당 없으면 null)"
  }
}`;

// ─── 내부 분석 함수 (인증 없음 — 호출부에서 소유권 보장) ─────────────────────────

async function analyzeMaterialCore(
  materialId: string,
  force: boolean,
): Promise<{ success: true; analysis: MaterialAnalysis } | { success: false; error: string }> {
  const material = await prisma.lectureMaterial.findUnique({
    where: { id: materialId },
    include: {
      course: {
        select: { name: true, category: true, hasAssignment: true, hasPractice: true },
      },
      round: { select: { week: true, label: true } },
    },
  });

  if (!material) return { success: false, error: "자료를 찾을 수 없습니다." };

  if (!force && material.analysis) {
    try {
      return { success: true, analysis: JSON.parse(material.analysis) as MaterialAnalysis };
    } catch {
      // 손상된 캐시 — 재분석으로 fallthrough
    }
  }

  let text: string;
  try {
    text = await extractFileText(material.filePath);
  } catch (err) {
    console.error("[analyzeMaterial] 텍스트 추출 실패:", material.filePath, err);
    return { success: false, error: "파일 텍스트 추출에 실패했습니다." };
  }

  if (!text || text.length < 10) {
    const ext = path.extname(material.filePath).toLowerCase();
    return {
      success: false,
      error: ext === ".ppt" || ext === ".pptx"
        ? "PPT 파일은 텍스트 추출이 제한적입니다. PDF로 변환 후 업로드를 권장합니다."
        : "추출된 텍스트가 너무 짧습니다. 스캔 품질이 낮거나 이미지만 있는 파일일 수 있습니다.",
    };
  }

  const roundLabel = material.round
    ? (material.round.label ?? `${material.round.week}주차`)
    : null;

  const courseContext = [
    roundLabel ? `주차: ${roundLabel}` : null,
    `과목명: ${material.course.name}`,
    material.course.category ? `분야: ${material.course.category}` : null,
    `과제 포함: ${material.course.hasAssignment ? "예" : "아니오"}`,
    `실습/예시 포함: ${material.course.hasPractice ? "예" : "아니오"}`,
  ]
    .filter((x): x is string => x !== null)
    .join("\n");

  const feedbackContext = await buildFeedbackContext(material.courseId, material.roundId);

  try {
    const response = await chatWithAI([
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `[강의 정보]\n${courseContext}${feedbackContext}\n\n[강의자료]\n${smartChunk(text)}`,
      },
    ], { temperature: 0.3 });

    let analysis: MaterialAnalysis;
    try {
      analysis = parseAIJson<MaterialAnalysis>(response.content);
    } catch {
      return { success: false, error: "AI 응답을 파싱할 수 없습니다." };
    }

    await prisma.lectureMaterial.update({
      where: { id: materialId },
      data: { analysis: JSON.stringify(analysis), analysisUpdatedAt: new Date() },
    });

    return { success: true, analysis };
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI 분석 실패";
    return { success: false, error: message };
  }
}

// ─── 공개 API: 인증 + 소유권 검증 후 core 호출 ──────────────────────────────────

export async function analyzeMaterial(
  materialId: string,
  force = false,
): Promise<{ success: true; analysis: MaterialAnalysis } | { success: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "인증 필요" };

  const ownership = await prisma.lectureMaterial.findUnique({
    where: { id: materialId },
    include: { course: { select: { professorId: true } } },
  });
  if (!ownership) return { success: false, error: "자료를 찾을 수 없습니다." };
  if (ownership.course.professorId !== session.user.id) return { success: false, error: "권한이 없습니다." };

  return analyzeMaterialCore(materialId, force);
}

// ─── 자동 재분석 트리거: 라운드 종료 후 피드백이 쌓인 자료 백그라운드 재분석 ────────

export async function triggerMaterialReanalysisIfNeeded(courseId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  const now = new Date();

  const materials = await prisma.lectureMaterial.findMany({
    where: { courseId, roundId: { not: null } },
    include: {
      round: {
        select: {
          endDate: true,
          _count: { select: { feedbacks: true } },
        },
      },
    },
  });

  // 라운드 종료됨 + 피드백 3건 이상 + (분석 없음 OR 라운드 종료 이전에 분석됨)
  const staleIds = materials
    .filter(
      (m) =>
        m.round &&
        m.round.endDate <= now &&
        m.round._count.feedbacks >= 3 &&
        (!m.analysis || !m.analysisUpdatedAt || m.analysisUpdatedAt <= m.round.endDate),
    )
    .map((m) => m.id);

  if (staleIds.length === 0) return;

  after(async () => {
    for (const id of staleIds) {
      await analyzeMaterialCore(id, true).catch(() => {});
    }
  });
}
