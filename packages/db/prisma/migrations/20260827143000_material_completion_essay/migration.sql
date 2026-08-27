ALTER TABLE "Material" ADD COLUMN "requireCompletionForDownload" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Question" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'MULTIPLE_CHOICE';
ALTER TABLE "Question" RENAME TO "Question_old";
CREATE TABLE "Question" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "quizId" TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  "text" TEXT NOT NULL,
  "options" TEXT NOT NULL DEFAULT '[]',
  "type" TEXT NOT NULL DEFAULT 'MULTIPLE_CHOICE',
  "correctIndex" INTEGER,
  "points" INTEGER NOT NULL DEFAULT 10,
  "imageUrl" TEXT,
  CONSTRAINT "Question_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "Question" ("id", "quizId", "order", "text", "options", "type", "correctIndex", "points", "imageUrl") SELECT "id", "quizId", "order", "text", "options", "type", "correctIndex", "points", "imageUrl" FROM "Question_old";
DROP TABLE "Question_old";
CREATE INDEX "Question_quizId_idx" ON "Question"("quizId");
CREATE TABLE "QuizAnswerGrade" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "attemptId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "graderId" TEXT NOT NULL,
  "score" REAL NOT NULL,
  "feedback" TEXT,
  "gradedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuizAnswerGrade_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "QuizAttempt" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "QuizAnswerGrade_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "QuizAnswerGrade_graderId_fkey" FOREIGN KEY ("graderId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "QuizAnswerGrade_attemptId_questionId_key" ON "QuizAnswerGrade"("attemptId", "questionId");
CREATE INDEX "QuizAnswerGrade_questionId_idx" ON "QuizAnswerGrade"("questionId");
