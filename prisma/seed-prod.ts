import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { execSync } from "node:child_process";

const url = process.env.DATABASE_URL ?? "file:./dev.db";
const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url }),
});

const count = await prisma.professor.count().catch(() => 0);

if (count === 0) {
  console.log("[seed-prod] DB empty, running seed...");
  execSync("npx tsx prisma/seed.ts", { stdio: "inherit", env: process.env });
} else {
  console.log(`[seed-prod] ${count} professor(s) found, skipping seed.`);
}

await prisma.$disconnect();
