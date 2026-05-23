-- Add fields for the redesigned student feedback form.
-- Existing legacy fields are retained for backwards compatibility and demo stability.
ALTER TABLE "Feedback" ADD COLUMN "materialHelp" INTEGER;
ALTER TABLE "Feedback" ADD COLUMN "positiveComment" TEXT;
ALTER TABLE "Feedback" ADD COLUMN "difficultyComment" TEXT;
ALTER TABLE "Feedback" ADD COLUMN "activityPoints" INTEGER NOT NULL DEFAULT 1;

UPDATE "Feedback"
SET
  "materialHelp" = COALESCE(
    "practice",
    CASE "comprehension"
      WHEN 'high' THEN 5
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 2
      ELSE CAST("comprehension" AS INTEGER)
    END
  ),
  "interest" = COALESCE(
    "interest",
    CASE "comprehension"
      WHEN 'high' THEN 5
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 2
      ELSE CAST("comprehension" AS INTEGER)
    END
  ),
  "comprehension" = CASE "comprehension"
    WHEN 'high' THEN '5'
    WHEN 'medium' THEN '3'
    WHEN 'low' THEN '2'
    ELSE "comprehension"
  END,
  "activityPoints" = CASE
    WHEN "comment" IS NOT NULL AND length(trim("comment")) >= 10 THEN 2
    ELSE 1
  END;

UPDATE "Feedback"
SET "difficultyComment" = "comment"
WHERE "comment" IS NOT NULL
  AND (
    "comment" LIKE '%좋겠%'
    OR "comment" LIKE '%어렵%'
    OR "comment" LIKE '%헷갈%'
    OR "comment" LIKE '%부족%'
    OR "comment" LIKE '%빠르%'
    OR "comment" LIKE '%느리%'
    OR "comment" LIKE '%필요%'
    OR "comment" LIKE '%추가%'
    OR "comment" LIKE '%설명%'
    OR "comment" LIKE '%예시%'
  );

UPDATE "Feedback"
SET "positiveComment" = "comment"
WHERE "comment" IS NOT NULL
  AND "difficultyComment" IS NULL;
