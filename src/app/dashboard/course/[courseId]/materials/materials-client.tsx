"use client";

import { useState } from "react";
import { analyzeMaterial, type MaterialAnalysis } from "@/app/actions/analyze-material";
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
        <h4 className="text-sm font-semibold text-gray-700 mb-1">핵심 요약</h4>
        <p className="text-sm text-gray-600">{analysis.summary}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-400 mb-1">난이도</p>
          <Badge className={diffColor}>{analysis.difficulty}</Badge>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-400 mb-1">용어 밀도</p>
          <Badge variant="secondary">{analysis.termDensity}</Badge>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-400 mb-1">예시 충분도</p>
          <Badge variant="secondary">{analysis.exampleSufficiency}</Badge>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-1">
          난이도 판단 근거
        </h4>
        <p className="text-sm text-gray-600">{analysis.difficultyReason}</p>
      </div>

      {(analysis.termExamples ?? []).length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-1">
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
        <h4 className="text-sm font-semibold text-gray-700 mb-1">
          예시 관련 피드백
        </h4>
        <p className="text-sm text-gray-600">{analysis.exampleFeedback}</p>
      </div>

      {analysis.improvements && (analysis.improvements.structure || analysis.improvements.examples || analysis.improvements.pedagogy) && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">개선 제안</h4>
          <div className="space-y-2">
            {analysis.improvements.structure && (
              <div className="flex gap-2 text-sm">
                <span className="shrink-0 font-medium text-blue-600">구조</span>
                <span className="text-gray-600">{analysis.improvements.structure}</span>
              </div>
            )}
            {analysis.improvements.examples && (
              <div className="flex gap-2 text-sm">
                <span className="shrink-0 font-medium text-green-600">예시</span>
                <span className="text-gray-600">{analysis.improvements.examples}</span>
              </div>
            )}
            {analysis.improvements.pedagogy && (
              <div className="flex gap-2 text-sm">
                <span className="shrink-0 font-medium text-purple-600">교수법</span>
                <span className="text-gray-600">{analysis.improvements.pedagogy}</span>
              </div>
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
        {label} 학생 피드백 {stats.total}건 — AI 분석에 반영됨
      </p>
      <div className={`grid gap-2 text-center ${stats.practiceAvg !== null ? "grid-cols-4" : "grid-cols-3"}`}>
        <div>
          <p className="text-xs text-blue-500">이해도 높음</p>
          <p className="text-sm font-medium text-blue-800">{stats.comprehensionHigh}%</p>
        </div>
        <div>
          <p className="text-xs text-blue-500">소통 만족도</p>
          <p className="text-sm font-medium text-blue-800">{stats.communicationAvg}/5</p>
        </div>
        <div>
          <p className="text-xs text-blue-500">속도 적절</p>
          <p className="text-sm font-medium text-blue-800">{stats.speedModerate}%</p>
        </div>
        {stats.practiceAvg !== null && (
          <div>
            <p className="text-xs text-blue-500">실습 충분도</p>
            <p className="text-sm font-medium text-blue-800">{stats.practiceAvg}/5</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function MaterialsClient({ courseId, initialMaterials, rounds }: Props) {
  const [materials, setMaterials] = useState(initialMaterials);
  const [uploading, setUploading] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoundId, setSelectedRoundId] = useState<string>("");

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

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

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md">
          {error}
        </div>
      )}

      {/* Upload */}
      <Card>
        <CardContent className="py-6 space-y-3">
          {rounds.length > 0 && (
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-600 shrink-0">주차 연결</label>
              <select
                value={selectedRoundId}
                onChange={(e) => setSelectedRoundId(e.target.value)}
                className="text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
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
          <label className="flex flex-col items-center justify-center gap-2 cursor-pointer border-2 border-dashed border-gray-200 rounded-lg p-8 hover:border-blue-300 transition-colors">
            <p className="text-sm text-gray-500">
              {uploading
                ? "업로드 중..."
                : "PDF, PPT, TXT 파일을 클릭하여 업로드"}
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
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            업로드된 강의자료가 없습니다.
          </CardContent>
        </Card>
      ) : (
        materials.map((m) => (
          <Card key={m.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <CardTitle className="text-base truncate">{m.fileName}</CardTitle>
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
