// src/modules/quiz/validators/quiz.validator.ts
//
// Zod validators + DTO types cho luồng ADMIN (UC36–UC39).
//
// Lưu ý kiến trúc: với Zod, một schema vừa là LUẬT VALIDATE (runtime) vừa là
// nguồn để suy ra TYPE DTO (compile-time) qua z.infer — cùng một nguồn sự thật,
// nên schema và DTO được đặt chung file (không tách vật lý để tránh thừa).
// Theo convention của dự án: mỗi module 1 file `<module>.validator.ts`.

import { z } from '../../../common/zod/z';
import { registry } from '../../../common/zod/openapi.registry';

// ─── Question (dùng chung cho create/update quiz & thao tác câu hỏi) ─
export const questionSchema = z.object({
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

// ─── Create Quiz (UC36-1) ──────────────────────────────────────
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
}).openapi('CreateQuizDto');

// ─── Update Quiz (UC36-2) ──────────────────────────────────────
// Schema riêng — KHÔNG dùng createQuizSchema.partial()
// vì partial() cho phép questions: [] (mảng rỗng) pass validation.
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

// ─── Add Question (UC37) ───────────────────────────────────────
export const addQuestionSchema = questionSchema.openapi('AddQuestionDto');

// ─── Update Question (UC38) ────────────────────────────────────
// Cho phép Admin cập nhật 1 phần câu hỏi (partial update).
// Nếu gửi cả options + correctAnswerIndex thì validate cross-field.
export const updateQuestionSchema = z.object({
  questionText: z.string()
    .min(1, 'Question text is required.')
    .optional()
    .openapi({ example: 'Updated question text?' }),
  options: z
    .array(z.string().min(1, 'Option cannot be empty.'))
    .min(2, 'At least 2 options are required.')
    .max(6, 'Maximum 6 options allowed.')
    .optional()
    .openapi({ example: ['New Option A', 'New Option B', 'New Option C'] }),
  correctAnswerIndex: z.number()
    .int()
    .min(0, 'Index must be >= 0')
    .optional()
    .openapi({ example: 1 }),
}).refine(
  (q) => {
    // Nếu cả 2 đều được gửi → validate cross-field
    if (q.options !== undefined && q.correctAnswerIndex !== undefined) {
      return q.correctAnswerIndex < q.options.length;
    }
    return true;
  },
  { message: 'correctAnswerIndex must be less than options length.' }
).refine(
  (q) => {
    // Phải gửi ít nhất 1 field để cập nhật
    return q.questionText !== undefined || q.options !== undefined || q.correctAnswerIndex !== undefined;
  },
  { message: 'At least one field (questionText, options, correctAnswerIndex) must be provided.' }
).openapi('UpdateQuestionDto');

// ─── Đăng ký Swagger registry ──────────────────────────────────
registry.register('CreateQuizDto', createQuizSchema);
registry.register('UpdateQuizDto', updateQuizSchema);
registry.register('AddQuestionDto', addQuestionSchema);
registry.register('UpdateQuestionDto', updateQuestionSchema);

// ─── DTO types (suy ra từ schema) ──────────────────────────────
export type CreateQuizDto      = z.infer<typeof createQuizSchema>;
export type UpdateQuizDto      = z.infer<typeof updateQuizSchema>;
export type QuestionDto        = z.infer<typeof questionSchema>;
export type UpdateQuestionDto  = z.infer<typeof updateQuestionSchema>;
