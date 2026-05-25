/**
 * 초기 시드 — 운영용.
 *
 * `.env` 의 ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME 로 교수(관리자) 계정 1개만
 * 생성한다. idempotent 하므로 여러 번 실행해도 안전하다(있으면 갱신).
 * 강의·학생·피드백 같은 운영 데이터는 로그인 후 직접 등록하거나
 * `prisma/add-user.ts` 스크립트로 추가한다 (docs/DB_GUIDE.md 참고).
 *
 * UI를 채워보고 싶다면 `npm run seed:example` 로 예시 데이터를 넣을 수 있다.
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "node:path";
import { hashPassword } from "../src/lib/auth-utils";

const dbUrl = process.env.DATABASE_URL ?? `file:${path.join(process.cwd(), "dev.db")}`;
const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: dbUrl }),
});

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const name = process.env.ADMIN_NAME ?? "관리자";
  const password = process.env.ADMIN_PASSWORD ?? "changeme1234";

  const hashed = await hashPassword(password);
  await prisma.professor.upsert({
    where: { email },
    update: { name, password: hashed },
    create: { email, name, password: hashed },
  });

  console.log(`[seed] 관리자 계정 준비 완료 → ${email}`);
  if (!process.env.ADMIN_PASSWORD) {
    console.warn(
      "[seed] ⚠ ADMIN_PASSWORD 가 .env 에 없어 기본값(changeme1234)을 사용했습니다. 운영 전 반드시 변경하세요.",
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
