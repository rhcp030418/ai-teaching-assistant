-- AlterTable
ALTER TABLE "Feedback" ADD COLUMN "assignment" INTEGER;
ALTER TABLE "Feedback" ADD COLUMN "interest" INTEGER;
ALTER TABLE "Feedback" ADD COLUMN "practice" INTEGER;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Course" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "semester" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '교양',
    "studentCount" INTEGER,
    "eclassId" INTEGER,
    "hasAssignment" BOOLEAN NOT NULL DEFAULT false,
    "hasPractice" BOOLEAN NOT NULL DEFAULT false,
    "professorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Course_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "Professor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Course" ("category", "createdAt", "eclassId", "id", "name", "professorId", "semester", "studentCount") SELECT "category", "createdAt", "eclassId", "id", "name", "professorId", "semester", "studentCount" FROM "Course";
DROP TABLE "Course";
ALTER TABLE "new_Course" RENAME TO "Course";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
