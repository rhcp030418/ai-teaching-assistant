import { getOwnedCourse } from "@/lib/course-access";
import { computeFeedbackCounts } from "@/lib/feedback-stats";
import { CourseNav } from "./course-nav";
import { ChatSidePanel } from "./chat-side-panel";
import { isDemoUser } from "@/lib/auth-utils";
import {
  COMM_AVG_THRESHOLD,
  SPEED_MODERATE_THRESHOLD,
  CHAT_COMP_SUGGESTION_THRESHOLD,
} from "@/lib/constants";

function formatSemester(semester: string) {
  const [year, term] = semester.split("-");
  return `${year}년 ${term === "1" ? "1학기" : "2학기"}`;
}

// ─── 동적 추천 질문 (오버뷰 → 레이아웃으로 이동, 채팅 단일 마운트) ──────────────
function buildChatSuggestions(
  communicationAvg: number,
  speedModerateRatio: number,
  comprehensionHighRatio: number,
  totalFeedbacks: number,
): string[] {
  if (totalFeedbacks === 0) {
    return [
      "좋은 강의 피드백을 받으려면 어떻게 해야 할까?",
      "수업 속도를 어떻게 설정하는 게 좋을까?",
      "질문·소통 편의를 높이는 방법이 뭐야?",
      "내용 이해를 돕는 전략을 알려줘.",
    ];
  }

  const suggestions: string[] = [];
  if (communicationAvg < COMM_AVG_THRESHOLD) {
    suggestions.push(`질문·소통 편의가 ${communicationAvg}점이야. 학생 의견에서 참고할 점이 있을까?`);
  }
  if (comprehensionHighRatio < CHAT_COMP_SUGGESTION_THRESHOLD) {
    suggestions.push(`내용 이해 "높음"이 ${comprehensionHighRatio}%야. 어떤 맥락을 보면 좋을까?`);
  }
  if (speedModerateRatio < SPEED_MODERATE_THRESHOLD) {
    suggestions.push(`수업 속도 "적당" 응답이 ${speedModerateRatio}%야. 어떻게 조정하면 좋을까?`);
  }

  const general = [
    "이번 학기에 가장 잘 된 부분은 뭐야?",
    "학생 의견 중 주목할 만한 게 있어?",
    "다음 회차에서 집중해야 할 게 뭐야?",
    "전체적인 강의 평가를 요약해줘.",
  ];
  for (const q of general) {
    if (suggestions.length >= 4) break;
    suggestions.push(q);
  }
  return suggestions.slice(0, 4);
}

export default async function CourseLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  // 소유권/데모 가드 + 헤더 메타. cache()로 page.tsx의 동일 호출과 dedupe.
  const course = await getOwnedCourse(courseId);
  const demoMode = isDemoUser(course.professor.email);

  // 채팅 추천 질문용 통계 (computeFeedbackCounts는 순수 함수)
  const { total, speedCounts, compCounts, commSum } = computeFeedbackCounts(course.feedbacks);
  const communicationAvg = total > 0 ? Math.round((commSum / total) * 10) / 10 : 0;
  const speedModerateRatio = total > 0 ? Math.round((speedCounts.moderate / total) * 100) : 0;
  const comprehensionHighRatio = total > 0 ? Math.round((compCounts.high / total) * 100) : 0;
  const now = new Date();
  const activeRound = course.feedbackRounds.find(
    (round) => round.startDate <= now && now < round.endDate,
  );
  const eyebrow = activeRound
    ? `${formatSemester(course.semester)} · ${activeRound.label ?? `${activeRound.week}주차`} 평가 진행 중`
    : `${formatSemester(course.semester)} · 강의 상세`;
  const suggestions = buildChatSuggestions(
    communicationAvg,
    speedModerateRatio,
    comprehensionHighRatio,
    total,
  );

  return (
    // V3: 강의 상세 영역만 cool blue-white 표면으로 (부모 main의 px/py-8을 상쇄해 full-bleed)
    <div
      className="-mx-8 -my-8 min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_12%_-8%,rgba(56,189,248,0.24),transparent_32%),radial-gradient(circle_at_88%_8%,rgba(22,119,255,0.13),transparent_30%),linear-gradient(180deg,#f8fbff_0%,#f5f8ff_48%,#f7fbff_100%)] px-8 py-8"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif',
      }}
    >
      {/* ─── 강의 헤더 + 코스 레벨 네비게이션 (공통) ─────────────────────── */}
      <div className="mb-6">
        <div className="relative overflow-hidden rounded-[24px] border border-blue-100/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(237,247,255,0.9))] px-7 py-6 shadow-[0_18px_48px_-28px_rgba(23,87,168,0.45)]">
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#1677FF]/[0.08]" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-100/80 px-3 py-1.5 text-xs font-bold text-[#0F5FD7]">
              {eyebrow}
            </span>
            <h1 className="mt-3 text-4xl font-bold leading-tight text-[#10233F]">{course.name}</h1>
            <p className="mt-2 text-sm text-slate-500">
              {course.professor.name} 교수님
              {course.studentCount ? ` · 수강생 ${course.studentCount}명` : ""}
              {" · 최근 피드백은 익명 집계로 정리됩니다."}
            </p>
          </div>
        </div>
        <div className="mt-[18px]">
          <CourseNav courseId={courseId} />
        </div>
      </div>

      {children}

      {/* 채팅은 레이아웃에서 단일 마운트 → 4개 코스 페이지 어디서나 접근 */}
      <ChatSidePanel courseId={courseId} suggestions={suggestions} demoMode={demoMode} />
    </div>
  );
}
