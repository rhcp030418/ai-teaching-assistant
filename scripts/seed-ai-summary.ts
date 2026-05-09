import { config } from "dotenv";
import { resolve } from "path";

// .env를 가장 먼저 로드
config({ path: resolve(process.cwd(), ".env") });

import { prisma } from "../src/lib/db";
import { chatWithAI } from "../src/lib/ai";

async function main() {
  console.log("AI_PROVIDER:", process.env.AI_PROVIDER);
  console.log("AI_BASE_URL:", process.env.AI_BASE_URL);
  console.log("AI_MODEL:", process.env.AI_MODEL);
  console.log("API_KEY 설정됨:", !!process.env.AI_API_KEY);
  console.log("");

  const courses = await prisma.course.findMany({
    include: { feedbacks: true },
  });

  const targets = courses.filter(
    (c) => !c.aiSummary && c.feedbacks.length >= 3
  );

  console.log(`총 ${courses.length}개 강의 중 ${targets.length}개 한줄평 생성 필요\n`);

  for (const course of targets) {
    const feedbacks = course.feedbacks;
    const total = feedbacks.length;
    const speedModerate = feedbacks.filter((f) => f.speed === "moderate").length;
    const comprehensionHigh = feedbacks.filter((f) => f.comprehension === "high").length;
    const communicationSum = feedbacks.reduce((s, f) => s + f.communication, 0);
    const interestFbs = feedbacks.filter((f) => f.interest != null);
    const interestAvg =
      interestFbs.length > 0
        ? interestFbs.reduce((s, f) => s + f.interest!, 0) / interestFbs.length
        : null;

    const statsLines = [
      `- 총 응답: ${total}건`,
      `- 속도 적절 비율: ${Math.round((speedModerate / total) * 100)}%`,
      `- 자료 이해도 높음: ${Math.round((comprehensionHigh / total) * 100)}%`,
      `- 소통 만족도 평균: ${Math.round((communicationSum / total) * 10) / 10}/5`,
      interestAvg !== null
        ? `- 강의 흥미도 평균: ${Math.round(interestAvg * 10) / 10}/5`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    process.stdout.write(`[${course.name}] 생성 중...`);

    try {
      const response = await chatWithAI([
        {
          role: "system",
          content:
            "당신은 대학 강의 평가 분석가입니다. 강의 피드백 통계를 보고 핵심을 한 문장으로 요약해주세요. 긍정적이고 건설적인 톤을 유지하고, 가장 두드러진 특징 하나를 짚어주세요. JSON 없이 순수 텍스트 한 문장만 반환하세요.",
        },
        {
          role: "user",
          content: `다음 강의 피드백 통계를 한 문장으로 요약해주세요:\n\n${statsLines}`,
        },
      ]);

      const summary = response.content.trim().replace(/^["']|["']$/g, "");

      await prisma.course.update({
        where: { id: course.id },
        data: { aiSummary: summary },
      });

      console.log(` 완료\n  → ${summary}\n`);
    } catch (e) {
      console.log(` 실패: ${e}\n`);
    }
  }

  if (targets.length === 0) {
    console.log("모든 강의에 이미 한줄평이 저장되어 있습니다.");
  }

  await prisma.$disconnect();
}

main();
