// src/modules/quiz/dto/update-quiz.dto.ts

import { z } from '../../../common/zod/z';
import { registry } from '../../../common/zod/openapi.registry';
import { questionSchema } from './question.dto';
import { QUIZ_LIMITS } from '../constants/quiz.constant';

// ─── Update Quiz Schema (Admin) ────────────────────────────────
// Schema riêng — KHÔNG dùng createQuizSchema.partial()
// vì partial() cho phép questions: [] (mảng rỗng) pass validation
export const updateQuizSchema = z.object({
  title: z.string().min(1).max(QUIZ_LIMITS.TITLE_MAX).optional()
    .openapi({ example: 'Updated Quiz Title' }),
  description: z.string().optional(),
  passingScorePercent: z.number().int()
    .min(QUIZ_LIMITS.PASSING_SCORE_MIN)
    .max(QUIZ_LIMITS.PASSING_SCORE_MAX)
    .optional()
    .openapi({ example: 70 }),
  timeLimitSeconds: z.number().int().positive().optional(),
  xpReward: z.number().int().min(QUIZ_LIMITS.XP_REWARD_MIN).optional(),
  questions: z.array(questionSchema).min(QUIZ_LIMITS.QUESTIONS_MIN).optional(),
}).openapi('UpdateQuizDto');

registry.register('UpdateQuizDto', updateQuizSchema);

export type UpdateQuizDto = z.infer<typeof updateQuizSchema>;
