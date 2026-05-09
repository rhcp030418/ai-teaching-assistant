"use client";

import { logoutAction } from "@/app/actions/auth";

export function SignOutButton() {
  return (
    <button
      onClick={() => logoutAction()}
      className="text-gray-400 hover:text-gray-600 text-sm"
    >
      로그아웃
    </button>
  );
}
