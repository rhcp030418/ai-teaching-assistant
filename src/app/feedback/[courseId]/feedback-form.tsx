"use client";

import { useState } from "react";
import { submitFeedback, submitStudentFeedback } from "@/app/actions/feedback";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const speedOptions = [
  { value: "fast", label: "빠름" },
  { value: "moderate", label: "적당" },
  { value: "slow", label: "느림" },
];

const comprehensionOptions = [
  { value: "high", label: "높음" },
  { value: "medium", label: "보통" },
  { value: "low", label: "낮음" },
];

function ScoreInput({
  name,
  label,
  value,
  onChange,
}: {
  name: string;
  label: string;
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <input type="hidden" name={name} value={value ?? ""} />
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((score) => (
            <button
              key={score}
              type="button"
              onClick={() => onChange(score)}
              className={`w-12 h-12 rounded-lg border-2 text-lg font-semibold transition-colors ${
                value === score
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:border-blue-300"
              }`}
            >
              {score}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">1 = 매우 불만족, 5 = 매우 만족</p>
      </CardContent>
    </Card>
  );
}

interface Props {
  courseId: string;
  token: string;
  mode?: "legacy" | "student";
  hasAssignment?: boolean;
  hasPractice?: boolean;
}

export function FeedbackForm({ courseId, token, mode = "legacy", hasAssignment = false, hasPractice = false }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warned, setWarned] = useState(false);
  const [pending, setPending] = useState(false);
  const [communication, setCommunication] = useState<number | null>(null);
  const [interest, setInterest] = useState<number | null>(null);
  const [assignment, setAssignment] = useState<number | null>(null);
  const [practice, setPractice] = useState<number | null>(null);

  if (submitted) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-lg font-semibold text-green-600">
            피드백이 제출되었습니다!
          </p>
          <p className="text-gray-500 mt-2">소중한 의견 감사합니다.</p>
        </CardContent>
      </Card>
    );
  }

  async function handleSubmit(formData: FormData, forceSubmit = false) {
    setPending(true);
    setError(null);
    setWarned(false);

    formData.set("courseId", courseId);
    formData.set("token", token);
    if (forceSubmit) {
      formData.set("forceSubmit", "true");
    }

    const action = mode === "student" ? submitStudentFeedback : submitFeedback;
    const result = await action(formData);
    setPending(false);

    if (result.success) {
      setSubmitted(true);
    } else if ("warned" in result && result.warned) {
      setWarned(true);
      setError(result.error ?? null);
    } else {
      setError(result.error ?? "제출 중 오류가 발생했습니다.");
    }
  }

  return (
    <form className="space-y-6">
      {error && !warned && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md">
          {error}
        </div>
      )}

      {warned && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm p-3 rounded-md space-y-2">
          <p>{error}</p>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setWarned(false);
                setError(null);
              }}
            >
              수정하기
            </Button>
            <Button
              type="submit"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                const form = e.currentTarget.closest("form")!;
                const formData = new FormData(form);
                handleSubmit(formData, true);
              }}
              disabled={pending}
            >
              {pending ? "제출 중..." : "이대로 제출"}
            </Button>
          </div>
        </div>
      )}

      {/* 수업 속도 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">수업 속도</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup name="speed" required className="flex gap-4">
            {speedOptions.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2 cursor-pointer"
              >
                <RadioGroupItem value={opt.value} />
                <span>{opt.label}</span>
              </label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* 자료 이해도 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">자료 이해도</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup name="comprehension" required className="flex gap-4">
            {comprehensionOptions.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2 cursor-pointer"
              >
                <RadioGroupItem value={opt.value} />
                <span>{opt.label}</span>
              </label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* 소통 만족도 */}
      <ScoreInput name="communication" label="소통 만족도" value={communication} onChange={setCommunication} />

      {/* 강의 흥미도 (항상 표시) */}
      <ScoreInput name="interest" label="강의 흥미도" value={interest} onChange={setInterest} />

      {/* 과제 적절성 (조건부) */}
      {hasAssignment && (
        <ScoreInput name="assignment" label="과제 적절성" value={assignment} onChange={setAssignment} />
      )}

      {/* 실습/예시 충분도 (조건부) */}
      {hasPractice && (
        <ScoreInput name="practice" label="실습/예시 충분도" value={practice} onChange={setPractice} />
      )}

      {/* 추가 의견 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            추가 의견 <span className="text-gray-400 font-normal">(선택)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            name="comment"
            placeholder="수업에 대한 의견을 자유롭게 작성해주세요."
            maxLength={500}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* 제출 안내 */}
      <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm p-3 rounded-md">
        한 번 제출하면 익명성 보장을 위해 <strong>수정할 수 없습니다</strong>. 신중하게 작성해주세요.
      </div>

      <Button
        type="button"
        className="w-full"
        size="lg"
        disabled={pending}
        onClick={(e) => {
          const form = e.currentTarget.closest("form") as HTMLFormElement;
          if (!form.reportValidity()) return;
          const ok = window.confirm(
            "제출 후에는 수정할 수 없습니다.\n정말 제출하시겠습니까?"
          );
          if (ok) {
            handleSubmit(new FormData(form));
          }
        }}
      >
        {pending ? "제출 중..." : "피드백 제출"}
      </Button>
    </form>
  );
}
