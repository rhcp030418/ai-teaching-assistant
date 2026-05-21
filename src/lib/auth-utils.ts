import bcrypt from "bcryptjs";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// 데모 계정(읽기 전용). 데모 자료 주입이 필요할 때만 Railway에서
// DEMO_WRITABLE=1 로 잠금을 일시 해제 → 주입 후 변수 제거(다시 읽기 전용).
const DEMO_EMAILS =
  process.env.DEMO_WRITABLE === "1" ? [] : ["kim@hansung.ac.kr"];

export function isDemoUser(email: string | null | undefined): boolean {
  return DEMO_EMAILS.includes(email ?? "");
}

export const DEMO_READ_ONLY = {
  success: false as const,
  error: "데모 계정은 읽기 전용입니다.",
};
