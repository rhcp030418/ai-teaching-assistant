import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { execSync } from "node:child_process";
import { backfillFeedbackRedesignFields } from "./feedback-redesign-backfill";
import { hashPassword } from "../src/lib/auth-utils";

async function ensureEclassSyncProfessor(prisma: PrismaClient) {
  const password = await hashPassword("demo1234");

  await prisma.professor.upsert({
    where: { email: "eclass-sync@hansung.ac.kr" },
    update: {
      name: "e-class 동기화",
      password,
    },
    create: {
      name: "e-class 동기화",
      email: "eclass-sync@hansung.ac.kr",
      password,
    },
  });

  console.log(
    "[seed-prod] eclass-sync professor ready (eclass-sync@hansung.ac.kr / demo1234).",
  );
}

async function main() {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url }),
  });

  try {
    const count = await prisma.professor.count().catch(() => 0);
    if (count === 0) {
      console.log("[seed-prod] DB empty, running seed...");
      execSync("npx tsx prisma/seed.ts", { stdio: "inherit", env: process.env });
    } else {
      console.log(`[seed-prod] ${count} professor(s) found, skipping seed.`);
    }

    await ensureEclassSyncProfessor(prisma);

    const result = await backfillFeedbackRedesignFields(prisma);
    console.log(
      `[seed-prod] feedback redesign backfill checked ${result.checked}, updated ${result.updated}.`,
    );

    console.log("[seed-prod] enriching demo database...");
    execSync("npx tsx prisma/enrich-demo-database.ts", {
      stdio: "inherit",
      env: process.env,
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
