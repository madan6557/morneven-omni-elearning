-- Manual availability is separate from archive so staff can temporarily close content
-- while preserving a safe preview for students.
ALTER TABLE "Material" ADD COLUMN "isOpen" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Material" ADD COLUMN "availableUntil" DATETIME;
ALTER TABLE "Assignment" ADD COLUMN "isOpen" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Assignment" ADD COLUMN "availableUntil" DATETIME;
ALTER TABLE "Quiz" ADD COLUMN "isOpen" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Quiz" ADD COLUMN "availableUntil" DATETIME;

CREATE INDEX "Material_isOpen_availableFrom_availableUntil_idx" ON "Material"("isOpen", "availableFrom", "availableUntil");
CREATE INDEX "Assignment_isOpen_availableFrom_availableUntil_idx" ON "Assignment"("isOpen", "availableFrom", "availableUntil");
CREATE INDEX "Quiz_isOpen_availableFrom_availableUntil_idx" ON "Quiz"("isOpen", "availableFrom", "availableUntil");
