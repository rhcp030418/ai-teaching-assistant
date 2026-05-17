-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LectureMaterial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "roundId" TEXT,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "analysis" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LectureMaterial_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LectureMaterial_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "FeedbackRound" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_LectureMaterial" ("analysis", "courseId", "createdAt", "fileName", "filePath", "id") SELECT "analysis", "courseId", "createdAt", "fileName", "filePath", "id" FROM "LectureMaterial";
DROP TABLE "LectureMaterial";
ALTER TABLE "new_LectureMaterial" RENAME TO "LectureMaterial";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
