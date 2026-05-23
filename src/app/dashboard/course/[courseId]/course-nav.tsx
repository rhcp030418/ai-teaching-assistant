"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { label: "현황 요약", sub: "" },
  { label: "지원 인사이트", sub: "/analysis" },
  { label: "관리 및 기록", sub: "/management" },
  { label: "비교 참고", sub: "/benchmark" },
  { label: "강의자료 분석", sub: "/materials" },
];

export function CourseNav({ courseId }: { courseId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/course/${courseId}`;

  return (
    <nav className="flex flex-wrap items-center gap-3 rounded-[22px] border border-blue-100/80 bg-white/70 p-2.5 shadow-[0_10px_30px_-18px_rgba(23,87,168,0.25)] backdrop-blur">
      {ITEMS.map((it) => {
        const href = base + it.sub;
        // 현황 요약(빈 sub)은 정확히 일치할 때만 활성, 나머지는 하위 경로 포함 활성
        const active =
          it.sub === "" ? pathname === base : pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            className={`min-w-[132px] rounded-[16px] px-5 py-3 text-center text-sm font-bold transition-colors ${
              active
                ? "bg-gradient-to-br from-[#1677FF] to-[#40B8FF] text-white shadow-[0_10px_20px_-8px_rgba(22,119,255,0.45)]"
                : "text-slate-500 hover:bg-blue-50 hover:text-[#0F5FD7]"
            }`}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
