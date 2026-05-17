import { prisma } from "@/lib/db";
import { classifyComment } from "@/lib/comment-classifier";
import { CLASSIFY_TIMEOUT_MS, CLASSIFY_MAX_QUEUE_SIZE } from "@/lib/constants";

type ClassifyJob = { feedbackId: string; comment: string };

const classifyQueue: ClassifyJob[] = [];
let classifyWorking = false;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("classify timeout")), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); }
    );
  });
}

async function processClassifyQueue() {
  if (classifyWorking) return;
  classifyWorking = true;

  while (classifyQueue.length > 0) {
    const job = classifyQueue.shift()!;
    try {
      const result = await withTimeout(classifyComment(job.comment), CLASSIFY_TIMEOUT_MS);
      await prisma.feedback.update({
        where: { id: job.feedbackId },
        data: {
          filteredComment: result.filtered,
          commentCategory: result.category,
          commentFilterReason: result.reason,
          commentHasProfanity: result.hasProfanity,
        },
      });
    } catch (err) {
      // 실패 시 commentCategory는 null로 유지 → 교수 노출 안 됨
      console.error("[classify] feedbackId=%s 분류 실패:", job.feedbackId, err);
    }
  }

  classifyWorking = false;
}

export function backgroundClassify(feedbackId: string, comment: string | null) {
  if (!comment) return;

  // 큐 폭주 방지: 너무 길면 가장 오래된 것 드롭
  if (classifyQueue.length >= CLASSIFY_MAX_QUEUE_SIZE) {
    classifyQueue.shift();
  }

  classifyQueue.push({ feedbackId, comment });
  processClassifyQueue();
}
