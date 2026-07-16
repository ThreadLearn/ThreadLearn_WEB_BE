// src/modules/quiz-attempts/presentation/validators/quiz-attempt.validator.ts
//
// Zod validator + DTO type cho luồng HỌC VIÊN nộp bài quiz (UC40/UC41).

import { z } from '../../../../common/zod/z';
import { registry } from '../../../../common/zod/openapi.registry';

// ─── Submit Quiz (Student) ─────────────────────────────────────
export const quizSubmitSchema = z.object({
  quizId: z.string()
    .min(1, 'Quiz ID is required.')
    .openapi({ example: '665f1b2c3d4e5f6a7b8c9d0e' }),
  answers: z.record(z.coerce.number())
    .openapi({ example: { '0': 1, '1': 2, '2': 0 } }),
  startTime: z.string()
    .datetime('Invalid startTime format. Must be an ISO-8601 datetime string.')
    .optional()
    .openapi({ example: '2026-06-17T02:00:00.000Z' }),
}).openapi('QuizSubmitDto');

export const quizAttemptHistoryQuerySchema = z.object({
  page: z.preprocess(
    (value) => (value === undefined || value === '' ? undefined : value),
    z.coerce.number().int().min(1).optional(),
  ),
  limit: z.preprocess(
    (value) => (value === undefined || value === '' ? undefined : value),
    z.coerce.number().int().min(1).max(100).optional(),
  ),
}).openapi('QuizAttemptHistoryQueryDto');

// ─── Đăng ký Swagger registry ──────────────────────────────────
registry.register('QuizSubmitDto', quizSubmitSchema);
registry.register('QuizAttemptHistoryQueryDto', quizAttemptHistoryQuerySchema);

// ─── DTO type ──────────────────────────────────────────────────
export type QuizSubmitDto = z.infer<typeof quizSubmitSchema>;
export type QuizAttemptHistoryQueryDto = z.infer<typeof quizAttemptHistoryQuerySchema>;
