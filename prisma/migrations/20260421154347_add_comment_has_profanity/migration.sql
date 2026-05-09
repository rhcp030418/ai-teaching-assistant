-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Feedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "roundId" TEXT,
    "speed" TEXT NOT NULL,
    "comprehension" TEXT NOT NULL,
    "communication" INTEGER NOT NULL,
    "interest" INTEGER,
    "assignment" INTEGER,
    "practice" INTEGER,
    "comment" TEXT,
    "filteredComment" TEXT,
    "commentCategory" TEXT,
    "commentFilterReason" TEXT,
    "commentHasProfanity" BOOLEAN NOT NULL DEFAULT false,
    "freeText" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Feedback_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Feedback_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "FeedbackRound" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Feedback" ("assignment", "comment", "commentCategory", "commentFilterReason", "communication", "comprehension", "courseId", "createdAt", "filteredComment", "freeText", "id", "interest", "practice", "roundId", "speed") SELECT "assignment", "comment", "commentCategory", "commentFilterReason", "communication", "comprehension", "courseId", "createdAt", "filteredComment", "freeText", "id", "interest", "practice", "roundId", "speed" FROM "Feedback";
DROP TABLE "Feedback";
ALTER TABLE "new_Feedback" RENAME TO "Feedback";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
