-- A course may have one UTS and one UAS module; regular modules remain unlimited.
CREATE UNIQUE INDEX "Module_courseId_examType_key"
ON "Module"("courseId", "type")
WHERE "type" IN ('UTS', 'UAS');
