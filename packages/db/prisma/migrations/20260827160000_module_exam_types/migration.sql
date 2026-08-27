ALTER TABLE "Module" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'REGULAR';
UPDATE "Module" SET "type" = 'UTS' WHERE "id" IN (SELECT "moduleId" FROM "Quiz" WHERE "kind" = 'UTS' AND "moduleId" IS NOT NULL);
UPDATE "Module" SET "type" = 'UAS' WHERE "id" IN (SELECT "moduleId" FROM "Quiz" WHERE "kind" = 'UAS' AND "moduleId" IS NOT NULL);
