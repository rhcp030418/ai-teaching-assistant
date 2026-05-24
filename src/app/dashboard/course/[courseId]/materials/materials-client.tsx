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

function normalizeExampleSufficiency(value: string) {
  if (value.includes("부족") || value.includes("보완")) return "보완 필요";
  if (value.includes("충분")) return "충분";
  return "보통";
}

function metricStyle(kind: "difficulty" | "term" | "example", value: string) {
  if (kind === "difficulty") {
    if (value.includes("상") || value.includes("높")) {
      return {
        card: "border-rose-100 bg-rose-50/80",
        label: "text-rose-600",
        badge: "bg-rose-100 text-rose-700",
      };
    }
    if (value.includes("중") || value.includes("보통")) {
      return {
        card: "border-amber-100 bg-amber-50/80",
        label: "text-amber-600",
        badge: "bg-amber-100 text-amber-700",
      };
    }
    return {
      card: "border-emerald-100 bg-emerald-50/80",
      label: "text-emerald-600",
      badge: "bg-emerald-100 text-emerald-700",
    };
  }

  if (kind === "term") {
    if (value.includes("높")) {
      return {
        card: "border-orange-100 bg-orange-50/80",
        label: "text-orange-600",
        badge: "bg-orange-100 text-orange-700",
      };
    }
    if (value.includes("낮")) {
      return {
        card: "border-emerald-100 bg-emerald-50/80",
        label: "text-emerald-600",
        badge: "bg-emerald-100 text-emerald-700",
      };
    }
    return {
      card: "border-sky-100 bg-sky-50/80",
      label: "text-sky-600",
      badge: "bg-sky-100 text-sky-700",
    };
  }

  const normalized = normalizeExampleSufficiency(value);
  if (normalized === "충분") {
    return {
      card: "border-emerald-100 bg-emerald-50/80",
      label: "text-emerald-600",
      badge: "bg-emerald-100 text-emerald-700",
    };
  }
  if (normalized === "보완 필요") {
    return {
      card: "border-amber-100 bg-amber-50/80",
      label: "text-amber-600",
      badge: "bg-amber-100 text-amber-700",
    };
  }
  return {
    card: "border-blue-100 bg-blue-50/80",
    label: "text-[#0F5FD7]",
    badge: "bg-blue-100 text-blue-700",
  };
}

function MaterialMetric({
  label,
  value,
  kind,
}: {
  label: string;
  value: string;
  kind: "difficulty" | "term" | "example";
}) {
  const style = metricStyle(kind, value);
  const displayValue = kind === "example" ? normalizeExampleSufficiency(value) : value;
  return (
    <div className={`rounded-2xl border p-3 text-center ${style.card}`}>
      <p className={`mb-1 text-xs font-extrabold ${style.label}`}>{label}</p>
      <Badge className={style.badge}>{displayValue}</Badge>
    </div>
  );
}

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

function splitSuggestion(text: string) {
  const match = text.match(/\s*(?:\(([^()]+)\)|\[근거:\s*([^\]]+)\])\s*$/);
  if (!match) return { body: text, evidence: null as string | null };
  return {
    body: text.slice(0, match.index).trim(),
    evidence: match[1] ?? match[2],
  };
}

function SuggestionText({ text, tone }: { text: string; tone: "blue" | "green" | "purple" }) {
  const suggestion = splitSuggestion(text);
  const toneClass = {
    blue: "text-blue-700",
    green: "text-green-700",
    purple: "text-purple-700",
  }[tone];
  return (
    <div className="mt-2 leading-6 text-[#27496D]">
      <p>{suggestion.body}</p>
      {suggestion.evidence && (
        <p className={`mt-1 text-xs font-extrabold ${toneClass}`}>
          근거 기법: {suggestion.evidence}
        </p>
      )}
    </div>
  );
}

function AnalysisResult({ analysis }: { analysis: MaterialAnalysis }) {
  return (
    <div className="space-y-4 mt-4">
      <div>
        <h4 className="text-sm font-semibold text-[#10233F] mb-1">AI 핵심 요약</h4>
        <p className="text-sm text-[#27496D]">{analysis.summary}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <MaterialMetric label="난이도" value={analysis.difficulty} kind="difficulty" />
        <MaterialMetric label="전문 용어 밀도" value={analysis.termDensity} kind="term" />
        <MaterialMetric label="예시 충분도" value={analysis.exampleSufficiency} kind="example" />
      </div>

      <details className="rounded-[16px] border border-blue-100 bg-white/70 p-3">
        <summary className="cursor-pointer text-xs font-bold text-[#0F5FD7]">
          판단 기준 보기
        </summary>
        <dl className="mt-3 grid gap-2 text-xs leading-5 text-slate-500">
          <div>
            <dt className="font-bold text-[#27496D]">난이도</dt>
            <dd>개념 복잡도, 선수지식 필요 정도, 학생 이해도 반응을 함께 참고합니다.</dd>
          </div>
          <div>
            <dt className="font-bold text-[#27496D]">전문 용어 밀도</dt>
            <dd>한 단락이나 한 장 안에서 새 개념·약어·전문 용어가 연속해서 등장하는 정도입니다. 높음은 용어가 나쁘다는 뜻이 아니라, 첫 학습자에게 중간 정리나 용어표가 필요할 수 있다는 신호입니다.</dd>
          </div>
          <div>
            <dt className="font-bold text-[#27496D]">예시 충분도</dt>
            <dd>개념별 사례, 실습, 비교 설명, 예상 결과가 자료 안에서 충분히 제공되는지 봅니다. 보완 필요는 예시가 없다는 뜻이 아니라, 특정 개념을 이해하려면 추가 사례가 더 도움이 된다는 의미입니다.</dd>
          </div>
        </dl>
      </details>

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
          <h4 className="text-sm font-semibold text-[#10233F] mb-1">AI 개선 제안</h4>
          <p className="mb-3 text-xs leading-5 text-slate-500">
            자료 구조, 예시, 설명 방식에서 바로 조정해볼 수 있는 부분을 정리합니다.
            근거 기법은 제안 뒤에 별도로 표시합니다.
          </p>
          <div className="space-y-2">
            {analysis.improvements.structure && (
              <details open className="rounded-[14px] border border-blue-100 bg-white/80 p-3 text-sm">
                <summary className="cursor-pointer font-bold text-blue-600">구조</summary>
                <SuggestionText text={analysis.improvements.structure} tone="blue" />
              </details>
            )}
            {analysis.improvements.examples && (
              <details open className="rounded-[14px] border border-emerald-100 bg-white/80 p-3 text-sm">
                <summary className="cursor-pointer font-bold text-green-600">예시</summary>
                <SuggestionText text={analysis.improvements.examples} tone="green" />
              </details>
            )}
            {analysis.improvements.pedagogy && (
              <details open className="rounded-[14px] border border-purple-100 bg-white/80 p-3 text-sm">
                <summary className="cursor-pointer font-bold text-purple-600">교수법</summary>
                <SuggestionText text={analysis.improvements.pedagogy} tone="purple" />
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
                        <Badge
                          className="bg-amber-100 text-amber-700 border border-amber-200"
                          title="현재 분석은 최근 학생 의견 일부를 아직 반영하지 않았을 수 있습니다. 재분석하면 자료 내용과 최신 학생 반응을 함께 다시 정리합니다."
                        >
                          최신 의견으로 재분석 가능
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
                      {m.isStale && (
                        <p className="hidden max-w-[220px] text-xs font-medium leading-5 text-amber-700 lg:block">
                          분석 이후 새 학생 의견이 쌓였습니다.
                        </p>
                      )}
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
