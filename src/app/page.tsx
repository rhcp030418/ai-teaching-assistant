import { BarChart3, FileText, Layers3, MessageSquare, Settings2 } from "lucide-react";
import { LoginForm } from "./login/login-form";

const features = [
  {
    icon: BarChart3,
    title: "현황 요약",
    desc: "AI가 학생 의견의 주요 흐름을 요약하고, 응답 수와 핵심 지표를 한 화면에 정리합니다.",
  },
  {
    icon: MessageSquare,
    title: "지원 인사이트",
    desc: "AI 원인 연결 분석과 로드맵을 참고해 학생 반응의 맥락을 더 깊게 확인합니다.",
  },
  {
    icon: Settings2,
    title: "관리 및 기록",
    desc: "평가 라운드와 피드백 링크를 관리하고, 회차별 리포트와 체크리스트를 확인합니다.",
  },
  {
    icon: Layers3,
    title: "비교 참고",
    desc: "AI가 정리한 유사 강의 경향과 익명 사례를 참고해 수업을 다른 관점에서 바라봅니다.",
  },
  {
    icon: FileText,
    title: "강의자료 분석",
    desc: "AI가 강의자료의 난이도, 용어 밀도, 예시 충분도를 학생 반응과 함께 정리합니다.",
  },
];

export default function Home() {
  return (
    <main
      className="min-h-screen bg-[radial-gradient(circle_at_12%_-8%,rgba(56,189,248,0.24),transparent_32%),radial-gradient(circle_at_88%_8%,rgba(22,119,255,0.13),transparent_30%),linear-gradient(180deg,#f8fbff_0%,#f5f8ff_48%,#f7fbff_100%)] px-6 py-8"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif',
      }}
    >
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center">
        <div className="w-full overflow-hidden rounded-[32px] border border-blue-100/90 bg-white/78 shadow-[0_26px_70px_-42px_rgba(23,87,168,0.55)] backdrop-blur">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_420px]">
            <section className="p-8 sm:p-10 lg:p-12">
              <span className="inline-flex rounded-full bg-blue-100/80 px-3 py-1.5 text-xs font-bold text-[#0F5FD7]">
                한성대학교 AX 프런티어 챌린지
              </span>
              <h1 className="mt-5 max-w-2xl text-5xl font-extrabold leading-tight tracking-tight text-[#10233F]">
                AI Teaching Assistant
              </h1>
              <p className="mt-5 max-w-xl whitespace-pre-line text-lg font-medium leading-8 text-[#27496D]">
                {"학생들이 남긴 의견을 강의 단위로 정리하고,\n교수자가 필요한 순간에 참고할 수 있는 분석 화면으로 보여줍니다."}
              </p>
            </section>

            <aside className="flex border-t border-blue-100 bg-[linear-gradient(180deg,rgba(239,246,255,0.72),rgba(255,255,255,0.92))] p-6 sm:p-8 lg:border-l lg:border-t-0">
              <div className="mx-auto flex w-full max-w-sm flex-col justify-center">
                <p className="mb-4 text-sm font-bold text-[#0F5FD7]">교수자 대시보드 접속</p>
                <LoginForm />
              </div>
            </aside>
          </div>

          <div className="grid gap-4 border-t border-blue-100 bg-blue-50/35 p-6 sm:grid-cols-2 lg:grid-cols-5 lg:p-7">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="min-h-[184px] rounded-[24px] border border-blue-100 bg-white/90 p-5 shadow-[0_10px_30px_rgba(23,87,168,0.07)]"
                >
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[16px] bg-blue-50 text-[#1677FF]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h2 className="mt-5 text-base font-extrabold text-[#10233F]">{feature.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
