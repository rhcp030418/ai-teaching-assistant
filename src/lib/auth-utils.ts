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

const DEMO_EMAILS = ["kim@hansung.ac.kr"];

export function isDemoUser(email: string | null | undefined): boolean {
  return DEMO_EMAILS.includes(email ?? "");
}

export const DEMO_READ_ONLY = {
  success: false as const,
  error: "데모 계정은 읽기 전용입니다.",
};
