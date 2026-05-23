import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { execSync } from "node:child_process";
import { backfillFeedbackRedesignFields } from "./feedback-redesign-backfill";

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
