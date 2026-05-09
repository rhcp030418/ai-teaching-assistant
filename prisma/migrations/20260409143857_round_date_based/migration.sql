/*
  Warnings:

  - You are about to drop the column `active` on the `FeedbackRound` table. All the data in the column will be lost.
  - Added the required column `endDate` to the `FeedbackRound` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startDate` to the `FeedbackRound` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FeedbackRound" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "label" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FeedbackRound_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_FeedbackRound" ("courseId", "createdAt", "id", "label", "week") SELECT "courseId", "createdAt", "id", "label", "week" FROM "FeedbackRound";
DROP TABLE "FeedbackRound";
ALTER TABLE "new_FeedbackRound" RENAME TO "FeedbackRound";
CREATE UNIQUE INDEX "FeedbackRound_courseId_week_key" ON "FeedbackRound"("courseId", "week");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
