import { z } from "zod";

// nim juga menampung NIDN dan identifier admin, jadi tidak dibatasi numerik.
export const IdentifierSchema = z.string().trim().min(3, "Identifier minimal 3 karakter").max(50, "Identifier maksimal 50 karakter").regex(/^[A-Za-z0-9._-]+$/, "Identifier hanya boleh berisi huruf, angka, titik, garis bawah, atau tanda minus");
export const PasswordSchema = z.string().min(8, "Password minimal 8 karakter").max(128, "Password maksimal 128 karakter");
export const LoginSchema = z.object({ nim: IdentifierSchema, password: z.string().min(1, "Password wajib diisi").max(128) });
export type LoginDTO = z.infer<typeof LoginSchema>;
export const RegisterSchema = z.object({ nim: IdentifierSchema, name: z.string().trim().min(2).max(100), password: PasswordSchema, role: z.enum(["ADMIN","DOSEN","MAHASISWA"]).default("MAHASISWA") });
export const ChangePasswordSchema = z.object({ password: PasswordSchema });
export const UpdateUserSchema = z.object({ nim: IdentifierSchema, name: z.string().trim().min(2).max(100), role: z.enum(["ADMIN","DOSEN","MAHASISWA"]), isActive: z.boolean().optional() });

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
  timeLimit: z.number().int().positive().nullable().optional(),
  timerMode: z.enum(["INDEPENDENT", "SYNC_DEADLINE"]).default("INDEPENDENT"),
  attemptLimit: z.number().int().min(-1).default(1),
  showAnswers: z.boolean().default(false),
  randomizeQuestions: z.boolean().default(false),
  randomizeOptions: z.boolean().default(false),
  questionCount: z.number().int().positive().nullable().optional(),
  resultReleaseMode: z.enum(["AUTO", "HIDDEN", "MANUAL", "SCHEDULED"]).default("AUTO"),
  resultReleaseAt: z.string().datetime().nullable().optional(),
  isOpen: z.boolean().default(true),
  availableFrom: z.string().datetime().nullable().optional(),
  availableUntil: z.string().datetime().nullable().optional(),
  deadline: z.string().datetime().nullable().optional(),
  questions: z.array(z.object({
    type: z.enum(["MULTIPLE_CHOICE", "ESSAY"]).default("MULTIPLE_CHOICE"),
    text: z.string().min(1),
    options: z.array(z.string().trim().min(1, "Opsi tidak boleh kosong.")).default([]),
    correctIndex: z.number().int().min(0).nullable().optional(),
    points: z.number().finite().positive().default(10),
    order: z.number().int().positive().optional(),
    imageUrl: z.string().refine((value) => value.startsWith("/") || /^https?:\/\//i.test(value), "imageUrl must be an absolute or relative URL").nullable().optional(),
  }).superRefine((question, ctx) => { if (question.type === "MULTIPLE_CHOICE" && (question.options.length < 2 || question.correctIndex === null || question.correctIndex === undefined || question.correctIndex >= question.options.length)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Multiple choice wajib memiliki minimal 2 opsi dan jawaban benar." }); })).min(1)
}).superRefine((quiz, ctx) => {
  if (quiz.availableFrom && quiz.deadline && new Date(quiz.deadline) < new Date(quiz.availableFrom)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["deadline"], message: "Deadline tidak boleh sebelum jadwal buka." });
  if (quiz.availableFrom && quiz.availableUntil && new Date(quiz.availableUntil) < new Date(quiz.availableFrom)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["availableUntil"], message: "Jadwal tutup tidak boleh sebelum jadwal buka." });
  if (quiz.resultReleaseMode === "SCHEDULED" && !quiz.resultReleaseAt) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["resultReleaseAt"], message: "Jadwal publikasi wajib diisi untuk mode terjadwal." });
});

export const ModuleTypeSchema = z.enum(["REGULAR", "UTS", "UAS"]);

export const SubmitQuizSchema = z.object({
  answers: z.array(z.object({ questionId: z.string().min(1), chosen: z.number().int().min(-1).optional(), answerText: z.string().max(10000).optional() }).refine((answer) => answer.chosen !== undefined || answer.answerText !== undefined, "Jawaban wajib diisi"))
});
export type SubmitQuizDTO = z.infer<typeof SubmitQuizSchema>;

// material
export const CreateMaterialSchema = z.object({
  moduleId: z.string(),
  title: z.string().min(2),
  type: z.enum(["VIDEO","PDF","PPT"]),
  sourceType: z.enum(["youtube","drive","upload"]),
  sourceUrl: z.string().min(1).refine((value) => value.startsWith("/uploads/") || /^https?:\/\//i.test(value), "Sumber materi harus berupa URL HTTP(S) atau file upload"),
  duration: z.number().finite().nonnegative().optional(),
  totalPages: z.number().int().positive().optional(),
  requireCompletionForDownload: z.boolean().optional(),
  isOpen: z.boolean().default(true),
  availableFrom: z.string().datetime().nullable().optional(),
  availableUntil: z.string().datetime().nullable().optional(),
  order: z.number().optional(),
}).superRefine((material, ctx) => {
  if (material.availableFrom && material.availableUntil && new Date(material.availableUntil) < new Date(material.availableFrom)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["availableUntil"], message: "Jadwal tutup tidak boleh sebelum jadwal buka." });
});

export const CreateAssignmentSchema = z.object({
  courseId: z.string().min(1),
  moduleId: z.string().min(1),
  title: z.string().trim().min(2, "Judul tugas minimal 2 karakter.").max(200),
  description: z.string().max(20000).nullable().optional(),
  isOpen: z.boolean().default(true),
  availableFrom: z.string().datetime().nullable().optional(),
  availableUntil: z.string().datetime().nullable().optional(),
  deadline: z.string().datetime().nullable().optional(),
}).superRefine((assignment, ctx) => {
  if (assignment.availableFrom && assignment.availableUntil && new Date(assignment.availableUntil) < new Date(assignment.availableFrom)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["availableUntil"], message: "Jadwal tutup tidak boleh sebelum jadwal buka." });
  if (assignment.availableFrom && assignment.deadline && new Date(assignment.deadline) < new Date(assignment.availableFrom)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["deadline"], message: "Deadline tidak boleh sebelum jadwal buka." });
});

// pagination
export const PaginationSchema = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(25) });
