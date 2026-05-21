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

// 데모 계정에서 노출할 과목 이름. 다른 과목은 데모 데이터가 부실하여 숨긴다.
// 데모 잠금일 때만 적용된다 — DEMO_WRITABLE=1 이면 isDemoUser가 false라 전체 노출(자료 주입용).
const DEMO_VISIBLE_COURSE_NAMES = ["데이터베이스"];

/** 데모 계정에서 해당 과목을 노출할지 여부. */
export function isDemoVisibleCourse(name: string): boolean {
  return DEMO_VISIBLE_COURSE_NAMES.includes(name);
}

/**
 * 데모 계정이면 노출 과목만 보이도록 하는 Prisma where 조각을 반환.
 * 데모가 아니면 빈 객체(필터 없음).
 */
export function demoCourseFilter(email: string | null | undefined) {
  return isDemoUser(email) ? { name: { in: DEMO_VISIBLE_COURSE_NAMES } } : {};
}

export const DEMO_READ_ONLY = {
  success: false as const,
  error: "데모 계정은 읽기 전용입니다.",
};
