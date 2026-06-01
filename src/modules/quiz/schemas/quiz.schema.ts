import { z } from 'zod';

// ─── Question Schema ───────────────────────────────────────────
const questionSchema = z.object({
  questionText: z.string().min(1, 'Question text is required.'),
  options: z
    .array(z.string().min(1, 'Option cannot be empty.'))
    .min(2, 'At least 2 options are required.')
    .max(6, 'Maximum 6 options allowed.'),
  correctAnswerIndex: z.number().int().min(0, 'Index must be >= 0'),
}).refine(
  (q) => q.correctAnswerIndex < q.options.length,
  { message: 'correctAnswerIndex must be less than options length.' }
);

// ─── Create Quiz Schema (Admin) ────────────────────────────────
export const createQuizSchema = z.object({
  lessonId: z.string().min(1, 'Lesson ID is required.'),
  title: z.string().min(1, 'Title is required.').max(255),
  description: z.string().optional(),
  passingScorePercent: z.number().int().min(0).max(100).default(80),
  timeLimitSeconds: z.number().int().positive().optional(),
  xpReward: z.number().int().positive().default(100),
  questions: z.array(questionSchema).min(1, 'Quiz must have at least 1 question.'),
});

// ─── Update Quiz Schema (Admin) ────────────────────────────────
// Schema riêng — KHÔNG dùng createQuizSchema.partial()
// vì partial() cho phép questions: [] (mảng rỗng) pass validation
export const updateQuizSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  passingScorePercent: z.number().int().min(0).max(100).optional(),
  timeLimitSeconds: z.number().int().positive().optional(),
  xpReward: z.number().int().positive().optional(),
  questions: z.array(questionSchema).min(1).optional(),
});

// ─── Submit Quiz Schema (Student) ─────────────────────────────
export const quizSubmitSchema = z.object({
  quizId: z.string().min(1, 'Quiz ID is required.'),
  answers: z.record(z.coerce.number()),
});

// ─── Types ────────────────────────────────────────────────────
export type CreateQuizDto = z.infer<typeof createQuizSchema>;
export type UpdateQuizDto = z.infer<typeof updateQuizSchema>;
export type QuizSubmitDto = z.infer<typeof quizSubmitSchema>;
export type QuestionDto = z.infer<typeof questionSchema>;
