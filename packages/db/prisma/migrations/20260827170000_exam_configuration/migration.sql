ALTER TABLE "Quiz" ADD COLUMN "randomizeQuestions" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Quiz" ADD COLUMN "randomizeOptions" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Quiz" ADD COLUMN "questionCount" INTEGER;
ALTER TABLE "Quiz" ADD COLUMN "resultReleaseMode" TEXT NOT NULL DEFAULT 'HIDDEN';
ALTER TABLE "Quiz" ADD COLUMN "resultReleaseAt" DATETIME;
ALTER TABLE "Quiz" ADD COLUMN "resultPublishedAt" DATETIME;
ALTER TABLE "Quiz" ADD COLUMN "resultPublishedById" TEXT;
ALTER TABLE "QuizAttempt" ADD COLUMN "expiresAt" DATETIME;

UPDATE "Module"
SET "type" = 'UTS'
WHERE "id" IN (SELECT "moduleId" FROM "Quiz" WHERE "kind" = 'UTS' AND "moduleId" IS NOT NULL);

UPDATE "Module"
SET "type" = 'UAS'
WHERE "id" IN (SELECT "moduleId" FROM "Quiz" WHERE "kind" = 'UAS' AND "moduleId" IS NOT NULL);

UPDATE "Quiz" SET "kind" = 'QUIZ' WHERE "kind" IN ('UTS', 'UAS');
