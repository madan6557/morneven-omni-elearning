ALTER TABLE "Quiz" ADD COLUMN "showAnswers" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "CourseInstructor" (
    "courseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "CourseInstructor_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CourseInstructor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY ("courseId", "userId")
);

CREATE INDEX "CourseInstructor_userId_idx" ON "CourseInstructor"("userId");
