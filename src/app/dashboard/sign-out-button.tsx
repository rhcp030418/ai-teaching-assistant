"use client";

import { logoutAction } from "@/app/actions/auth";

export function SignOutButton() {
  return (
    <button
      onClick={() => logoutAction()}
      className="rounded-full px-3 py-2 text-sm font-bold text-slate-400 hover:bg-blue-50 hover:text-[#0F5FD7]"
    >
      로그아웃
    </button>
  );
}
