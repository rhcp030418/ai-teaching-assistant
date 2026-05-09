import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env") });

import { prisma } from "../src/lib/db";

async function main() {
  const r = await prisma.course.updateMany({ data: { aiSummary: null } });
  console.log(`${r.count}개 강의 캐시 초기화 완료`);
  await prisma.$disconnect();
}

main();
