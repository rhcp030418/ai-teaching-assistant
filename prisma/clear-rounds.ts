import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "node:path";

const dbPath = path.join(process.cwd(), "dev.db");
const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: `file:${dbPath}` }) });

async function main() {
  await prisma.submissionLog.deleteMany();
  await prisma.feedback.updateMany({ data: { roundId: null } });
  await prisma.feedbackRound.deleteMany();
  console.log("Rounds + SubmissionLogs cleared");
}

main().catch(console.error).finally(() => prisma.$disconnect());
