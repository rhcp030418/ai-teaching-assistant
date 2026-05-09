"use client";

import { useState } from "react";
import { analyzeMaterial } from "@/app/actions/analyze-material";
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

interface MaterialAnalysis {
  summary: string;
  difficulty: string;
  difficultyReason: string;
  termDensity: string;
  termExamples: string[];
  exampleSufficiency: string;
  exampleFeedback: string;
  improvements: string[];
}

interface Material {
  id: string;
  fileName: string;
  hasAnalysis: boolean;
  analysis: MaterialAnalysis | null;
  createdAt: string;
}

interface Props {
  courseId: string;
  initialMaterials: Material[];
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

      {analysis.termExamples.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-1">
            주요 전문 용어
          </h4>
          <div className="flex flex-wrap gap-2">
            {analysis.termExamples.map((term, i) => (
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

      {analysis.improvements.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-1">
            개선 제안
          </h4>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            {analysis.improvements.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function MaterialsClient({ courseId, initialMaterials }: Props) {
  const [materials, setMaterials] = useState(initialMaterials);
  const [uploading, setUploading] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.set("file", file);
    formData.set("courseId", courseId);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "업로드 실패");
      } else {
        setMaterials((prev) => [
          {
            id: data.id,
            fileName: data.fileName,
            hasAnalysis: false,
            analysis: null,
            createdAt: new Date().toISOString(),
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

  async function handleAnalyze(materialId: string) {
    setAnalyzingId(materialId);
    setError(null);

    const result = await analyzeMaterial(materialId);

    if (result.success) {
      setMaterials((prev) =>
        prev.map((m) =>
          m.id === materialId
            ? { ...m, hasAnalysis: true, analysis: result.analysis }
            : m
        )
      );
    } else {
      setError(result.error ?? "분석 실패");
    }

    setAnalyzingId(null);
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
        <CardContent className="py-6">
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
                <div>
                  <CardTitle className="text-base">{m.fileName}</CardTitle>
                  <CardDescription>
                    {new Date(m.createdAt).toLocaleDateString("ko-KR")}
                  </CardDescription>
                </div>
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
                  <Badge className="bg-green-100 text-green-700">
                    분석 완료
                  </Badge>
                )}
              </div>
            </CardHeader>
            {m.analysis && (
              <CardContent>
                <Separator className="mb-4" />
                <AnalysisResult analysis={m.analysis} />
              </CardContent>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
