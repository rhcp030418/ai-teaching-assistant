"use client";

import { useState } from "react";
import { analyzeMaterial, deleteMaterial, type MaterialAnalysis } from "@/app/actions/analyze-material";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DEMO_MATERIAL_ANALYSIS } from "@/lib/demo-ai-fixtures";

interface RoundStats {
  total: number;
  comprehensionHigh: number;
  communicationAvg: number;
  speedModerate: number;
  practiceAvg: number | null;
}

interface Round {
  id: string;
  week: number;
  label: string | null;
}

interface Material {
  id: string;
  fileName: string;
  hasAnalysis: boolean;
  analysis: MaterialAnalysis | null;
  createdAt: string;
  roundId: string | null;
  roundLabel: string | null;
  roundWeek: number | null;
  roundStats: RoundStats | null;
  analysisUpdatedAt: string | null;
  roundEndDate: string | null;
  isStale: boolean;
}

interface Props {
  courseId: string;
  initialMaterials: Material[];
  rounds: Round[];
  demoMode?: boolean;
}

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB
const V3_CARD =
  "ring-0 border-blue-100 bg-white/90 shadow-[0_10px_30px_-15px_rgba(23,87,168,0.25)]";

function withDemoMaterialData(materials: Material[], rounds: Round[]): Material[] {
  const fallbackRound = rounds[rounds.length - 1] ?? null;
  if (materials.length === 0) {
    return [
      {
        id: "demo-material-transaction-index",
        fileName: "06_트랜잭션과_인덱스.pdf",
        hasAnalysis: true,
        analysis: DEMO_MATERIAL_ANALYSIS,
        createdAt: new Date().toISOString(),
        roundId: fallbackRound?.id ?? null,
        roundLabel: fallbackRound ? (fallbackRound.label ?? `${fallbackRound.week}주차`) : "6주차",
        roundWeek: fallbackRound?.week ?? 6,
        roundStats: {
          total: 28,
          comprehensionHigh: 71,
          communicationAvg: 4.4,
          speedModerate: 68,
          practiceAvg: 4.1,
        },
        analysisUpdatedAt: new Date().toISOString(),
        roundEndDate: null,
        isStale: true,
      },
    ];
  }

  return materials.map((material, index) => ({
    ...material,
    hasAnalysis: true,
    analysis: material.analysis ?? DEMO_MATERIAL_ANALYSIS,
    roundStats: material.roundStats ?? {
      total: 28,
      comprehensionHigh: 71,
      communicationAvg: 4.4,
      speedModerate: 68,
      practiceAvg: 4.1,
    },
    isStale: index === 0 ? true : material.isStale,
  }));
}

function AnalysisResult({ analysis }: { analysis: MaterialAnalysis }) {
  const diffColor =
    analysis.difficulty === "상"
      ? "bg-red-100 text-red-700"
      : analysis.difficulty === "중"
        ? "bg-yellow-100 text-yellow-700"
        : "bg-green-100 text-green-700";

  return (
    <div className="space-y-4 mt-4">
      <div>
        <h4 className="text-sm font-semibold text-[#10233F] mb-1">핵심 요약</h4>
        <p className="text-sm text-[#27496D]">{analysis.summary}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 bg-blue-50/60 rounded-lg">
          <p className="text-xs text-gray-400 mb-1">난이도</p>
          <Badge className={diffColor}>{analysis.difficulty}</Badge>
        </div>
        <div className="text-center p-3 bg-blue-50/60 rounded-lg">
          <p className="text-xs text-gray-400 mb-1">용어 밀도</p>
          <Badge variant="secondary">{analysis.termDensity}</Badge>
        </div>
        <div className="text-center p-3 bg-blue-50/60 rounded-lg">
          <p className="text-xs text-gray-400 mb-1">예시 충분도</p>
          <Badge variant="secondary">{analysis.exampleSufficiency}</Badge>
        </div>
      </div>

      <div className="rounded-[16px] border border-blue-100 bg-white/80 p-3">
        <h4 className="text-xs font-bold text-[#0F5FD7]">판단 기준</h4>
        <dl className="mt-2 grid gap-2 text-xs leading-5 text-slate-500">
          <div>
            <dt className="font-bold text-[#27496D]">난이도</dt>
            <dd>개념 복잡도, 선수지식 필요 정도, 학생 이해도 반응을 함께 참고합니다.</dd>
          </div>
          <div>
            <dt className="font-bold text-[#27496D]">용어 밀도</dt>
            <dd>전문 용어가 얼마나 자주, 압축적으로 등장하는지 확인합니다.</dd>
          </div>
          <div>
            <dt className="font-bold text-[#27496D]">예시 충분도</dt>
            <dd>개념별 예시, 실습, 비교 설명이 학습 흐름을 돕는지 확인합니다.</dd>
          </div>
        </dl>
      </div>

      <div>
          <h4 className="text-sm font-semibold text-[#10233F] mb-1">
          난이도 판단 근거
        </h4>
        <p className="text-sm text-[#27496D]">{analysis.difficultyReason}</p>
      </div>

      {(analysis.termExamples ?? []).length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-[#10233F] mb-1">
            주요 전문 용어
          </h4>
          <div className="flex flex-wrap gap-2">
            {(analysis.termExamples ?? []).map((term, i) => (
              <Badge key={i} variant="outline">
                {term}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="text-sm font-semibold text-[#10233F] mb-1">
          예시 관련 피드백
        </h4>
        <p className="text-sm text-[#27496D]">{analysis.exampleFeedback}</p>
      </div>

      {analysis.improvements && (analysis.improvements.structure || analysis.improvements.examples || analysis.improvements.pedagogy) && (
        <div>
          <h4 className="text-sm font-semibold text-[#10233F] mb-2">개선 제안</h4>
          <div className="space-y-2">
            {analysis.improvements.structure && (
              <details className="rounded-[14px] border border-blue-100 bg-white/80 p-3 text-sm">
                <summary className="cursor-pointer font-bold text-blue-600">구조</summary>
                <p className="mt-2 leading-6 text-[#27496D]">{analysis.improvements.structure}</p>
              </details>
            )}
            {analysis.improvements.examples && (
              <details className="rounded-[14px] border border-emerald-100 bg-white/80 p-3 text-sm">
                <summary className="cursor-pointer font-bold text-green-600">예시</summary>
                <p className="mt-2 leading-6 text-[#27496D]">{analysis.improvements.examples}</p>
              </details>
            )}
            {analysis.improvements.pedagogy && (
              <details className="rounded-[14px] border border-sky-100 bg-white/80 p-3 text-sm">
                <summary className="cursor-pointer font-bold text-sky-600">교수법</summary>
                <p className="mt-2 leading-6 text-[#27496D]">{analysis.improvements.pedagogy}</p>
              </details>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RoundFeedbackPanel({ label, stats }: { label: string; stats: RoundStats }) {
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4">
      <p className="text-xs font-semibold text-blue-700 mb-2">
        {label} 자료 관련 피드백 참고 지표 · 응답 {stats.total}건
      </p>
      <div className={`grid gap-2 text-center ${stats.practiceAvg !== null ? "grid-cols-3" : "grid-cols-2"}`}>
        <div>
          <p className="text-xs text-blue-500">응답 수</p>
          <p className="text-sm font-medium text-blue-800">{stats.total}건</p>
        </div>
        <div>
          <p className="text-xs text-blue-500">내용 이해 높음</p>
          <p className="text-sm font-medium text-blue-800">{stats.comprehensionHigh}%</p>
        </div>
        {stats.practiceAvg !== null && (
          <div>
            <p className="text-xs text-blue-500">실습·예시</p>
            <p className="text-sm font-medium text-blue-800">{stats.practiceAvg}/5</p>
          </div>
        )}
      </div>
      <p className="mt-2 text-[11px] leading-4 text-blue-500/80">
        질문·소통 편의와 수업 속도는 자료 자체 지표가 아니므로 이 카드에서는 제외했습니다.
      </p>
    </div>
  );
}

export function MaterialsClient({ courseId, initialMaterials, rounds, demoMode = false }: Props) {
  const [materials, setMaterials] = useState(
    demoMode ? withDemoMaterialData(initialMaterials, rounds) : initialMaterials
  );
  const [uploading, setUploading] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoundId, setSelectedRoundId] = useState<string>("");

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_UPLOAD_SIZE) {
      setError("파일 크기는 10MB 이하만 가능합니다.");
      e.target.value = "";
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.set("file", file);
    formData.set("courseId", courseId);
    if (selectedRoundId) formData.set("roundId", selectedRoundId);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "업로드 실패");
      } else {
        const linkedRound = rounds.find((r) => r.id === selectedRoundId) ?? null;
        setMaterials((prev) => [
          {
            id: data.id,
            fileName: data.fileName,
            hasAnalysis: false,
            analysis: null,
            createdAt: new Date().toISOString(),
            roundId: selectedRoundId || null,
            roundLabel: linkedRound
              ? (linkedRound.label ?? `${linkedRound.week}주차`)
              : null,
            roundWeek: linkedRound?.week ?? null,
            roundStats: null,
            analysisUpdatedAt: null,
            roundEndDate: null,
            isStale: false,
          },
          ...prev,
        ]);
      }
    } catch {
      setError("업로드 중 오류가 발생했습니다.");
    }

    setUploading(false);
    e.target.value = "";
  }

  async function handleAnalyze(materialId: string, force = false) {
    setAnalyzingId(materialId);
    setError(null);
    if (demoMode) {
      setMaterials((prev) =>
        prev.map((m) =>
          m.id === materialId
            ? {
                ...m,
                hasAnalysis: true,
                analysis: DEMO_MATERIAL_ANALYSIS,
                isStale: false,
                analysisUpdatedAt: new Date().toISOString(),
              }
            : m
        )
      );
      setAnalyzingId(null);
      return;
    }
    try {
      const result = await analyzeMaterial(materialId, force);
      if (result.success) {
        setMaterials((prev) =>
          prev.map((m) =>
            m.id === materialId
              ? { ...m, hasAnalysis: true, analysis: result.analysis ?? null, isStale: false, analysisUpdatedAt: new Date().toISOString() }
              : m
          )
        );
      } else {
        setError(result.error ?? "분석 실패");
      }
    } catch {
      setError("분석 중 오류가 발생했습니다.");
    } finally {
      setAnalyzingId(null);
    }
  }

  async function handleDelete(materialId: string, fileName: string) {
    if (
      !window.confirm(
        `"${fileName}" 자료를 삭제할까요?\n파일과 분석 결과가 함께 삭제되며 되돌릴 수 없습니다.`
      )
    ) {
      return;
    }
    setDeletingId(materialId);
    setError(null);
    try {
      const result = await deleteMaterial(materialId);
      if (result.success) {
        setMaterials((prev) => prev.filter((m) => m.id !== materialId));
      } else {
        setError(result.error ?? "삭제 실패");
      }
    } catch {
      setError("삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md">
          {error}
        </div>
      )}

      {/* Upload */}
      <Card className={V3_CARD}>
        <CardContent className="py-6 space-y-3">
          {rounds.length > 0 && (
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-[#27496D] shrink-0">주차 연결</label>
              <select
                value={selectedRoundId}
                onChange={(e) => setSelectedRoundId(e.target.value)}
                className="text-sm border border-blue-100 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
              >
                <option value="">주차 미지정 (전체 자료)</option>
                {rounds.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label ?? `${r.week}주차`}
                  </option>
                ))}
              </select>
              {selectedRoundId && (
                <p className="text-xs text-blue-600">
                  선택한 주차의 피드백이 AI 분석에 반영됩니다
                </p>
              )}
            </div>
          )}
          <label className="flex flex-col items-center justify-center gap-2 cursor-pointer border-2 border-dashed border-blue-200 bg-blue-50/40 rounded-[18px] p-8 hover:border-blue-300 transition-colors">
            <p className="text-sm font-medium text-slate-500">
              {uploading
                ? "업로드 중..."
                : "PDF, PPT, TXT 파일을 클릭하여 업로드 (10MB 이하)"}
            </p>
            <input
              type="file"
              accept=".pdf,.ppt,.pptx,.txt"
              onChange={handleUpload}
              disabled={uploading}
              className="sr-only"
            />
          </label>
        </CardContent>
      </Card>

      {/* Material list */}
      {materials.length === 0 ? (
        <Card className={V3_CARD}>
          <CardContent className="py-12 text-center text-slate-400">
            업로드된 강의자료가 없습니다.
          </CardContent>
        </Card>
      ) : (
        materials.map((m) => (
          <Card key={m.id} className={V3_CARD}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <CardTitle className="text-base truncate text-[#10233F]">{m.fileName}</CardTitle>
                  {m.roundLabel ? (
                    <Badge className="shrink-0 bg-blue-100 text-blue-700 border-blue-200">
                      {m.roundLabel}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="shrink-0 text-gray-400">
                      주차 미지정
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <CardDescription className="hidden sm:block">
                    {new Date(m.createdAt).toLocaleDateString("ko-KR")}
                  </CardDescription>
                  {!m.hasAnalysis && (
                    <Button
                      size="sm"
                      onClick={() => handleAnalyze(m.id)}
                      disabled={analyzingId === m.id}
                    >
                      {analyzingId === m.id ? "분석 중..." : "AI 분석"}
                    </Button>
                  )}
                  {m.hasAnalysis && (
                    <>
                      {m.isStale ? (
                        <Badge className="bg-amber-100 text-amber-700 border border-amber-200">
                          피드백 반영 재분석 권장
                        </Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-700">분석 완료</Badge>
                      )}
                      <Button
                        size="sm"
                        variant={m.isStale ? "default" : "outline"}
                        onClick={() => handleAnalyze(m.id, true)}
                        disabled={analyzingId === m.id}
                        className={m.isStale ? "bg-amber-500 hover:bg-amber-600 text-white border-0" : ""}
                      >
                        {analyzingId === m.id ? "분석 중..." : "재분석"}
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(m.id, m.fileName)}
                    disabled={deletingId === m.id || analyzingId === m.id}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  >
                    {deletingId === m.id ? "삭제 중..." : "삭제"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            {m.analysis && (
              <CardContent>
                <Separator className="mb-4" />
                {m.roundLabel && m.roundStats && (
                  <RoundFeedbackPanel label={m.roundLabel} stats={m.roundStats} />
                )}
                {m.roundLabel && !m.roundStats && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4">
                    <p className="text-xs text-blue-600">
                      {m.roundLabel} 피드백 데이터가 없습니다. 피드백 수집 후 재분석하면 해당 주차 반응이 반영됩니다.
                    </p>
                  </div>
                )}
                <AnalysisResult analysis={m.analysis} />
              </CardContent>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
