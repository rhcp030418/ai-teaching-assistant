import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SignOutButton } from "./sign-out-button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div
      className="min-h-screen bg-[radial-gradient(circle_at_12%_-8%,rgba(56,189,248,0.18),transparent_32%),linear-gradient(180deg,#f8fbff_0%,#f5f8ff_48%,#f7fbff_100%)]"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif',
      }}
    >
      {/* Top nav */}
      <header className="sticky top-0 z-20 h-[68px] border-b border-blue-100/80 bg-[#fafdff]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-[34px]">
          <Link href="/dashboard" className="flex items-center gap-3 text-lg font-extrabold text-[#10233F]">
            <span className="grid h-9 w-9 place-items-center rounded-[13px] bg-gradient-to-br from-[#1677FF] to-[#38BDF8] text-base font-black text-white shadow-[0_10px_24px_rgba(22,119,255,0.24)]">
              A
            </span>
            <span>AI Teaching Assistant</span>
          </Link>
          <nav className="flex items-center gap-2 text-sm font-bold text-slate-500">
            <Link
              href="/dashboard"
              className="rounded-full px-3 py-2 text-slate-500 hover:bg-blue-50 hover:text-[#0F5FD7]"
            >
              강의 목록
            </Link>
            <Link
              href="/dashboard/tone"
              className="rounded-full px-3 py-2 text-slate-500 hover:bg-blue-50 hover:text-[#0F5FD7]"
            >
              말투 교정
            </Link>
            <Link
              href="/dashboard/guide"
              className="rounded-full px-3 py-2 text-slate-500 hover:bg-blue-50 hover:text-[#0F5FD7]"
            >
              기능 사용 설명서
            </Link>
            <span className="ml-3 h-8 w-px bg-blue-100" />
            <span className="grid h-8 w-8 place-items-center rounded-full bg-blue-50 text-xs font-extrabold text-[#1677FF]">
              {session.user.name?.slice(0, 1) ?? "U"}
            </span>
            <span className="text-[#27496D]">{session.user.name} 교수님</span>
            <SignOutButton />
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-[1440px] mx-auto px-8 py-8 pb-24">{children}</main>

      <div className="fixed bottom-6 left-7 z-40 hidden max-w-[calc(100vw-3.5rem)] whitespace-nowrap rounded-full border border-blue-100 bg-white/68 px-6 py-3.5 text-[15px] font-semibold leading-none text-slate-500 opacity-35 shadow-[0_16px_42px_rgba(23,87,168,0.12)] backdrop-blur transition duration-200 hover:opacity-95 focus-within:opacity-95 lg:block">
        AI 안내: 요약·분석은 참고 자료이며 오탐, 누락, 과도한 추정이 있을 수 있습니다. 최종 판단은 교수자가 확인해 주세요.
      </div>
    </div>
  );
}
