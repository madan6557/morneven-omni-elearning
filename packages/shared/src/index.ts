import { z } from "zod";

// auth
export const LoginSchema = z.object({ nim: z.string().min(3), password: z.string().min(3) });
export type LoginDTO = z.infer<typeof LoginSchema>;
export const RegisterSchema = z.object({ nim: z.string().min(3), name: z.string().min(2), password: z.string().min(6), role: z.enum(["ADMIN","DOSEN","MAHASISWA"]).default("MAHASISWA") });

// progress
export const VideoProgressSchema = z.object({ materialId: z.string(), pos: z.number().min(0), duration: z.number().min(1) });
export type VideoProgressDTO = z.infer<typeof VideoProgressSchema>;

export const SlideProgressSchema = z.object({ materialId: z.string(), page: z.number().min(1) });
export type SlideProgressDTO = z.infer<typeof SlideProgressSchema>;

// quiz
export const CreateQuizSchema = z.object({
  title: z.string().min(3),
  kind: z.enum(["QUIZ","PRETEST","POSTTEST"]).default("QUIZ"),
  courseId: z.string().optional(),
  moduleId: z.string().optional(),
  passingScore: z.number().min(0).max(100).default(60),
  timeLimit: z.number().nullable().optional(),
  timerMode: z.enum(["INDEPENDENT", "SYNC_DEADLINE"]).default("INDEPENDENT"),
  attemptLimit: z.number().int().min(-1).default(1),
  showAnswers: z.boolean().default(false),
  randomizeQuestions: z.boolean().default(false),
  randomizeOptions: z.boolean().default(false),
  questionCount: z.number().int().positive().nullable().optional(),
  resultReleaseMode: z.enum(["HIDDEN", "MANUAL", "SCHEDULED"]).default("HIDDEN"),
  resultReleaseAt: z.string().datetime().nullable().optional(),
  availableFrom: z.string().datetime().nullable().optional(),
  questions: z.array(z.object({
    type: z.enum(["MULTIPLE_CHOICE", "ESSAY"]).default("MULTIPLE_CHOICE"),
    text: z.string().min(1),
    options: z.array(z.string()).default([]),
    correctIndex: z.number().min(0).nullable().optional(),
    points: z.number().default(10),
    order: z.number().optional(),
    imageUrl: z.string().refine((value) => value.startsWith("/") || /^https?:\/\//i.test(value), "imageUrl must be an absolute or relative URL").nullable().optional(),
  }).superRefine((question, ctx) => { if (question.type === "MULTIPLE_CHOICE" && (question.options.length < 2 || question.correctIndex === null || question.correctIndex === undefined || question.correctIndex >= question.options.length)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Multiple choice wajib memiliki minimal 2 opsi dan jawaban benar." }); })).min(1)
});

export const ModuleTypeSchema = z.enum(["REGULAR", "UTS", "UAS"]);

export const SubmitQuizSchema = z.object({
  answers: z.array(z.object({ questionId: z.string(), chosen: z.number().optional(), answerText: z.string().optional() }))
});
export type SubmitQuizDTO = z.infer<typeof SubmitQuizSchema>;

// material
export const CreateMaterialSchema = z.object({
  moduleId: z.string(),
  title: z.string().min(2),
  type: z.enum(["VIDEO","PDF","PPT"]),
  sourceType: z.enum(["youtube","drive","upload"]),
  sourceUrl: z.string().min(1),
  duration: z.number().optional(),
  totalPages: z.number().optional(),
  requireCompletionForDownload: z.boolean().optional(),
  availableFrom: z.string().datetime().nullable().optional(),
  order: z.number().optional(),
});

// pagination
export const PaginationSchema = z.object({ page: z.coerce.number().default(1), limit: z.coerce.number().default(20) });
