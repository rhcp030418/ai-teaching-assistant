-- CreateTable
CREATE TABLE "ImprovementNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "roundId" TEXT,
    "category" TEXT NOT NULL,
    "axis" TEXT NOT NULL,
    "changeDelta" REAL NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImprovementNote_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ImprovementNote_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "FeedbackRound" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
