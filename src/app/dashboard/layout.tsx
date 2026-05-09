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
    <div className="min-h-screen bg-gray-50">
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
