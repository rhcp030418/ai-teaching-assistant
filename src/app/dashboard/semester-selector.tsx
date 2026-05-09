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
        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
          current === "all"
            ? "bg-blue-600 text-white"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        전체
      </button>
      {semesters.map((s) => (
        <button
          key={s}
          onClick={() => handleChange(s)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            current === s
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {formatSemester(s)}
        </button>
      ))}
    </div>
  );
}
