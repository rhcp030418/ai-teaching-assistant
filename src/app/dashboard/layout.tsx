import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SignOutButton } from "./sign-out-button";
import { isDemoUser } from "@/lib/auth-utils";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const isDemo = isDemoUser(session.user.email);

  return (
    <div className="min-h-screen bg-gray-50">
      {isDemo && (
        <div className="bg-amber-50 border-b border-amber-200 sticky top-0 z-20">
          <div className="max-w-[1440px] mx-auto px-8 py-2 text-sm text-amber-700">
            데모 계정으로 접속 중입니다. 모든 분석 기능은 사용 가능하지만, 데이터 변경(라운드/토큰 생성, 파일 업로드 등)은 제한됩니다.
          </div>
        </div>
      )}
      {/* Top nav */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-[1440px] mx-auto px-8 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-bold text-gray-900 tracking-tight">
            AI Teaching Assistant
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/dashboard"
              className="text-gray-600 hover:text-gray-900"
            >
              강의 목록
            </Link>
            <Link
              href="/dashboard/tone"
              className="text-gray-600 hover:text-gray-900"
            >
              톤 보정
            </Link>
            <span className="text-gray-400">|</span>
            <span className="text-gray-500">{session.user.name}</span>
            <SignOutButton />
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-[1440px] mx-auto px-8 py-8">{children}</main>
    </div>
  );
}
