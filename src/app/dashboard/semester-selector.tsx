"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface Props {
  semesters: string[];
  current: string;
}

export function SemesterSelector({ semesters, current }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(semester: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (semester === "all") {
      params.delete("semester");
    } else {
      params.set("semester", semester);
    }
    router.push(`/dashboard?${params.toString()}`);
  }

  function formatSemester(s: string) {
    const [year, term] = s.split("-");
    return `${year}년 ${term === "1" ? "1학기" : "2학기"}`;
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={() => handleChange("all")}
        className={`rounded-full border px-4 py-2 text-sm font-extrabold shadow-sm transition-all ${
          current === "all"
            ? "border-transparent bg-gradient-to-r from-[#1677FF] to-[#38BDF8] text-white shadow-[0_12px_24px_rgba(22,119,255,0.20)]"
            : "border-blue-100 bg-white/80 text-[#27496D] hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/70"
        }`}
      >
        전체
      </button>
      {semesters.map((s) => (
        <button
          key={s}
          onClick={() => handleChange(s)}
          className={`rounded-full border px-4 py-2 text-sm font-extrabold shadow-sm transition-all ${
            current === s
              ? "border-transparent bg-gradient-to-r from-[#1677FF] to-[#38BDF8] text-white shadow-[0_12px_24px_rgba(22,119,255,0.20)]"
              : "border-blue-100 bg-white/80 text-[#27496D] hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/70"
          }`}
        >
          {formatSemester(s)}
        </button>
      ))}
    </div>
  );
}
