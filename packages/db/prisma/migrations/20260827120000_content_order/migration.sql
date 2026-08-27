ALTER TABLE "Quiz" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Assignment" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

UPDATE "Quiz" SET "order" = (
  SELECT COUNT(*) FROM "Quiz" q2
  WHERE q2."moduleId" IS "Quiz"."moduleId"
    AND (q2."createdAt" < "Quiz"."createdAt" OR (q2."createdAt" = "Quiz"."createdAt" AND q2."id" <= "Quiz"."id"))
);
UPDATE "Assignment" SET "order" = (
  SELECT COUNT(*) FROM "Assignment" a2
  WHERE a2."moduleId" IS "Assignment"."moduleId"
    AND (a2."createdAt" < "Assignment"."createdAt" OR (a2."createdAt" = "Assignment"."createdAt" AND a2."id" <= "Assignment"."id"))
);
