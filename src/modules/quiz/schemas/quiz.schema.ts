// src/modules/quiz/schemas/quiz.schema.ts

import { z } from '../../../common/zod/z';
import { registry } from '../../../common/zod/openapi.registry';

// ─── Question Schema ───────────────────────────────────────────
const questionSchema = z.object({
  questionText: z.string()
    .min(1, 'Question text is required.')
    .openapi({ example: 'What is a race condition?' }),
  options: z
    .array(z.string().min(1, 'Option cannot be empty.'))
    .min(2, 'At least 2 options are required.')
    .max(6, 'Maximum 6 options allowed.')
    .openapi({ example: ['Option A', 'Option B', 'Option C'] }),
  correctAnswerIndex: z.number()
    .int()
    .min(0, 'Index must be >= 0')
    .openapi({ example: 0 }),
}).refine(
  (q) => q.correctAnswerIndex < q.options.length,
  { message: 'correctAnswerIndex must be less than options length.' }
);

// ─── Create Quiz Schema ────────────────────────────────────────
export const createQuizSchema = z.object({
  lessonId: z.string()
    .min(1, 'Lesson ID is required.')
    .openapi({ example: '665f1b2c3d4e5f6a7b8c9d0e' }),
  title: z.string()
    .min(1, 'Title is required.')
    .max(255)
    .openapi({ example: 'JavaScript Event Loop Quiz' }),
  description: z.string()
    .optional()
    .openapi({ example: 'Test your knowledge of async JS.' }),
  passingScorePercent: z.number().int().min(0).max(100).default(80)
    .openapi({ example: 80 }),
  timeLimitSeconds: z.number().int().positive().optional()
    .openapi({ example: 300 }),
  xpReward: z.number().int().positive().default(100)
    .openapi({ example: 100 }),
  questions: z.array(questionSchema)
    .min(1, 'Quiz must have at least 1 question.'),
}).openapi('CreateQuizDto');  // ← tên hiển thị trong Swagger UI

// ─── Update Quiz Schema ────────────────────────────────────────
export const updateQuizSchema = z.object({
  title: z.string().min(1).max(255).optional()
    .openapi({ example: 'Updated Quiz Title' }),
  description: z.string().optional(),
  passingScorePercent: z.number().int().min(0).max(100).optional()
    .openapi({ example: 70 }),
  timeLimitSeconds: z.number().int().positive().optional(),
  xpReward: z.number().int().positive().optional(),
  questions: z.array(questionSchema).min(1).optional(),
}).openapi('UpdateQuizDto');

// ─── Submit Quiz Schema ────────────────────────────────────────
export const quizSubmitSchema = z.object({
  quizId: z.string()
    .min(1, 'Quiz ID is required.')
    .openapi({ example: '665f1b2c3d4e5f6a7b8c9d0e' }),
  answers: z.record(z.coerce.number())
    .openapi({ example: { '0': 1, '1': 2, '2': 0 } }),
}).openapi('QuizSubmitDto');

// ─── Đăng ký vào Swagger registry ─────────────────────────────
registry.register('CreateQuizDto', createQuizSchema);
registry.register('UpdateQuizDto', updateQuizSchema);
registry.register('QuizSubmitDto', quizSubmitSchema);

// ─── Types ────────────────────────────────────────────────────
export type CreateQuizDto = z.infer<typeof createQuizSchema>;
export type UpdateQuizDto = z.infer<typeof updateQuizSchema>;
export type QuizSubmitDto = z.infer<typeof quizSubmitSchema>;
export type QuestionDto = z.infer<typeof questionSchema>;