"use client";

import { useMemo, useState } from "react";
import { submitFeedback, submitStudentFeedback } from "@/app/actions/feedback";
import { filterComment } from "@/lib/comment-filter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const speedOptions = [
  { value: "very_slow", label: "많이 느렸어요" },
  { value: "slow", label: "조금 느렸어요" },
  { value: "moderate", label: "적당했어요" },
  { value: "fast", label: "조금 빨랐어요" },
  { value: "very_fast", label: "많이 빨랐어요" },
];

const V3_CARD =
  "rounded-[22px] border-blue-100 bg-white/90 shadow-[0_10px_30px_-15px_rgba(23,87,168,0.25)]";

function ScoreInput({
  name,
  label,
  description,
  value,
  onChange,
  optional = false,
}: {
  name: string;
  label: string;
  description: string;
  value: number | null;
  onChange: (v: number | null) => void;
  optional?: boolean;
}) {
  return (
    <Card className={V3_CARD}>
      <CardHeader>
        <CardTitle className="text-base text-[#10233F]">{label}</CardTitle>
        <CardDescription className="text-slate-500">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <input type="hidden" name={name} value={value ?? ""} />
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((score) => (
            <button
              key={score}
              type="button"
              onClick={() => onChange(score)}
              className={`h-12 rounded-[14px] border text-lg font-bold transition-colors ${
                value === score
                  ? "border-[#1677FF] bg-gradient-to-br from-[#1677FF] to-[#38BDF8] text-white shadow-[0_10px_20px_-12px_rgba(22,119,255,0.7)]"
                  : "border-blue-100 bg-white text-[#27496D] hover:border-blue-300 hover:bg-blue-50"
              }`}
              aria-pressed={value === score}
            >
              {score}
            </button>
          ))}
        </div>
        {optional && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className={`mt-3 w-full rounded-[14px] border px-3 py-2 text-sm font-bold transition-colors ${
              value === null
                ? "border-slate-300 bg-slate-100 text-slate-600"
                : "border-blue-100 bg-white text-slate-500 hover:bg-blue-50"
            }`}
            aria-pressed={value === null}
          >
            이번 회차에는 해당 없음
          </button>
        )}
        <div className="mt-2 flex justify-between text-xs font-semibold text-slate-400">
          <span>전혀 아니다</span>
          <span>매우 그렇다</span>
        </div>
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

function commentWarning(...comments: string[]) {
  const joined = comments.filter(Boolean).join("\n");
  if (!joined.trim()) return null;
  const result = filterComment(joined);
  if (!result.reason) return null;
  return result;
}

export function FeedbackForm({
  courseId,
  token,
  mode = "legacy",
  hasAssignment = false,
  hasPractice = false,
}: Props) {
  const isAdditionalFeedback = mode === "legacy";
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warned, setWarned] = useState(false);
  const [pending, setPending] = useState(false);
  const [speed, setSpeed] = useState<string | null>(null);
  const [comprehension, setComprehension] = useState<number | null>(null);
  const [materialHelp, setMaterialHelp] = useState<number | null>(null);
  const [communication, setCommunication] = useState<number | null>(null);
  const [interest, setInterest] = useState<number | null>(null);
  const [assignment, setAssignment] = useState<number | null>(null);
  const [practice, setPractice] = useState<number | null>(null);
  const [generalComment, setGeneralComment] = useState("");
  const [positiveComment, setPositiveComment] = useState("");
  const [difficultyComment, setDifficultyComment] = useState("");

  const liveWarning = useMemo(
    () => commentWarning(isAdditionalFeedback ? generalComment : positiveComment, difficultyComment),
    [difficultyComment, generalComment, isAdditionalFeedback, positiveComment]
  );

  if (submitted) {
    return (
      <Card className={V3_CARD}>
        <CardContent className="py-12 text-center">
          <p className="text-lg font-semibold text-green-600">피드백이 제출되었습니다!</p>
          <p className="mt-2 text-gray-500">소중한 의견 감사합니다.</p>
        </CardContent>
      </Card>
    );
  }

  function validateClient() {
    if (isAdditionalFeedback) {
      return generalComment.trim() ? null : "피드백 내용을 작성해주세요.";
    }

    const missing: string[] = [];
    if (!speed) missing.push("수업 속도");
    if (!comprehension) missing.push("내용 이해");
    if (!materialHelp) missing.push("자료·예시 도움");
    if (!communication) missing.push("질문·소통 편의");
    if (!interest) missing.push("학습 몰입");
    if (missing.length > 0) {
      return `다음 필수 문항을 선택해주세요: ${missing.join(", ")}`;
    }
    return null;
  }

  async function handleSubmit(formData: FormData, forceSubmit = false) {
    const clientError = validateClient();
    if (clientError) {
      setError(clientError);
      setWarned(false);
      return;
    }

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
        <div className="rounded-[18px] border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}

      {warned && (
        <div className="space-y-2 rounded-[18px] border border-yellow-200 bg-yellow-50 p-3 text-sm font-semibold text-yellow-800">
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
                handleSubmit(new FormData(form), true);
              }}
              disabled={pending}
            >
              {pending ? "제출 중..." : "이대로 제출"}
            </Button>
          </div>
        </div>
      )}

      <Card className={`${V3_CARD} bg-gradient-to-br from-white via-white to-blue-50/70`}>
        <CardHeader>
          <CardTitle className="text-base text-[#10233F]">
            {isAdditionalFeedback ? "추가 피드백 안내" : "익명 피드백 안내"}
          </CardTitle>
          <CardDescription className="leading-6 text-slate-500">
            {isAdditionalFeedback
              ? "정규 주차 평가와 별도로 남기는 익명 의견입니다. 강의 전반에서 더 전달하고 싶은 내용을 자유롭게 남겨주세요."
              : "응답은 익명으로 집계되며 교수자는 누가 작성했는지 알 수 없습니다. 정답은 없으니 오늘 수업에서 느낀 그대로 선택해 주세요."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700">약 2분</span>
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">익명 제출</span>
          </div>
        </CardContent>
      </Card>

      {!isAdditionalFeedback && (
        <>
          <ScoreInput
            name="comprehension"
            label="내용 이해"
            description="오늘 수업 내용을 잘 이해할 수 있었다."
            value={comprehension}
            onChange={setComprehension}
          />

          <ScoreInput
            name="materialHelp"
            label="자료·예시 도움"
            description="강의 자료와 예시가 이해에 도움이 되었다."
            value={materialHelp}
            onChange={setMaterialHelp}
          />

          <ScoreInput
            name="communication"
            label="질문·소통 편의"
            description="질문하거나 의견을 말하기 편했다."
            value={communication}
            onChange={setCommunication}
          />

          <ScoreInput
            name="interest"
            label="학습 몰입"
            description="수업 흐름이 집중을 유지하는 데 도움이 되었다."
            value={interest}
            onChange={setInterest}
          />

          <Card className={V3_CARD}>
            <CardHeader>
              <CardTitle className="text-base text-[#10233F]">수업 속도</CardTitle>
              <CardDescription className="text-slate-500">
                속도는 좋고 나쁨이 아니라 느림/빠름의 방향과 강도를 따로 집계합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <input type="hidden" name="speed" value={speed ?? ""} />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
                {speedOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSpeed(opt.value)}
                    className={`min-h-12 rounded-[14px] border px-2 text-sm font-bold transition-colors ${
                      speed === opt.value
                        ? "border-[#1677FF] bg-gradient-to-br from-[#1677FF] to-[#38BDF8] text-white shadow-[0_10px_20px_-12px_rgba(22,119,255,0.7)]"
                        : "border-blue-100 bg-white text-[#27496D] hover:border-blue-300 hover:bg-blue-50"
                    }`}
                    aria-pressed={speed === opt.value}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {hasAssignment && (
            <ScoreInput
              name="assignment"
              label="과제 적절성"
              description="이번 회차에 과제가 있었다면, 난이도와 분량이 수업 내용과 잘 맞았다."
              value={assignment}
              onChange={setAssignment}
              optional
            />
          )}

          {hasPractice && (
            <ScoreInput
              name="practice"
              label="실습·예시 도움"
              description="이번 회차에 실습이나 예시가 있었다면, 내용을 이해하는 데 도움이 되었다."
              value={practice}
              onChange={setPractice}
              optional
            />
          )}
        </>
      )}

      <Card className={V3_CARD}>
        <CardHeader>
          <CardTitle className="text-base text-[#10233F]">
            {isAdditionalFeedback ? "피드백 내용 작성" : "학생 의견"}{" "}
            <span className="font-normal text-slate-400">({isAdditionalFeedback ? "필수" : "선택"})</span>
          </CardTitle>
          <CardDescription className="leading-6 text-slate-500">
            {isAdditionalFeedback
              ? "특정 주차가 아니라 강의 전반에 대해 추가로 전달하고 싶은 내용을 자유롭게 작성해 주세요."
              : "짧게 한 줄만 적어도 충분합니다."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAdditionalFeedback ? (
            <Textarea
              name="comment"
              value={generalComment}
              onChange={(e) => setGeneralComment(e.target.value)}
              placeholder="예: 강의 전반에서 도움이 되었던 점, 더 설명이 필요한 부분, 과제·자료·소통과 관련해 전달하고 싶은 내용을 자유롭게 작성해 주세요."
              maxLength={800}
              rows={6}
              className="rounded-[18px] border-blue-100 focus-visible:ring-blue-200"
            />
          ) : (
            <>
              <div>
                <label className="mb-2 block text-sm font-extrabold text-[#10233F]">좋았던 점</label>
                <Textarea
                  name="positiveComment"
                  value={positiveComment}
                  onChange={(e) => setPositiveComment(e.target.value)}
                  placeholder="예: 정규화 예시를 표로 보여줘서 이해하기 쉬웠어요."
                  maxLength={500}
                  rows={3}
                  className="rounded-[18px] border-blue-100 focus-visible:ring-blue-200"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-extrabold text-[#10233F]">
                  아쉬웠던 점
                </label>
                <Textarea
                  name="difficultyComment"
                  value={difficultyComment}
                  onChange={(e) => setDifficultyComment(e.target.value)}
                  placeholder="예: 조인 종류별 차이가 아직 헷갈려서 예시가 조금 더 있으면 좋겠습니다."
                  maxLength={500}
                  rows={3}
                  className="rounded-[18px] border-blue-100 focus-visible:ring-blue-200"
                />
              </div>
            </>
          )}
          {liveWarning?.reason ? (
            <div
              className={`rounded-[16px] border p-3 text-sm font-semibold ${
                liveWarning.blocked
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              표현을 한 번 확인해 주세요. {liveWarning.reason}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="rounded-[18px] border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
        한 번 제출하면 익명성 보장을 위해 <strong>수정할 수 없습니다</strong>. 제출 전 선택한 항목을 확인해 주세요.
      </div>

      <Button
        type="button"
        className="w-full rounded-full bg-[#1677FF] font-extrabold text-white shadow-[0_14px_28px_rgba(22,119,255,0.22)] hover:bg-[#0F5FD7]"
        size="lg"
        disabled={pending}
        onClick={(e) => {
          const form = e.currentTarget.closest("form") as HTMLFormElement;
          const ok = window.confirm("제출 후에는 수정할 수 없습니다.\n정말 제출하시겠습니까?");
          if (ok) {
            handleSubmit(new FormData(form));
          }
        }}
      >
        {pending ? "제출 중..." : isAdditionalFeedback ? "추가 피드백 제출" : "익명 피드백 제출"}
      </Button>
    </form>
  );
}
