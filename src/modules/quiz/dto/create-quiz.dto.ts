// src/modules/quiz/dto/create-quiz.dto.ts

import { z } from '../../../common/zod/z';
import { registry } from '../../../common/zod/openapi.registry';
import { questionSchema } from './question.dto';
import { QUIZ_DEFAULTS, QUIZ_LIMITS } from '../constants/quiz.constant';

// ─── Create Quiz Schema (Admin) ────────────────────────────────
export const createQuizSchema = z.object({
  lessonId: z.string()
    .min(1, 'Lesson ID is required.')
    .openapi({ example: '665f1b2c3d4e5f6a7b8c9d0e' }),
  title: z.string()
    .min(1, 'Title is required.')
    .max(QUIZ_LIMITS.TITLE_MAX)
    .openapi({ example: 'JavaScript Event Loop Quiz' }),
  description: z.string()
    .optional()
    .openapi({ example: 'Test your knowledge of async JS.' }),
  passingScorePercent: z.number().int()
    .min(QUIZ_LIMITS.PASSING_SCORE_MIN)
    .max(QUIZ_LIMITS.PASSING_SCORE_MAX)
    .default(QUIZ_DEFAULTS.PASSING_SCORE_PERCENT)
    .openapi({ example: QUIZ_DEFAULTS.PASSING_SCORE_PERCENT }),
  timeLimitSeconds: z.number().int().positive().optional()
    .openapi({ example: 300 }),
  xpReward: z.number().int()
    .min(QUIZ_LIMITS.XP_REWARD_MIN)
    .default(QUIZ_DEFAULTS.XP_REWARD)
    .openapi({ example: QUIZ_DEFAULTS.XP_REWARD }),
  questions: z.array(questionSchema)
    .min(QUIZ_LIMITS.QUESTIONS_MIN, `Quiz must have at least ${QUIZ_LIMITS.QUESTIONS_MIN} question.`),
}).openapi('CreateQuizDto');

// ─── Add Question Schema (UC37) ────────────────────────────────
export const addQuestionSchema = questionSchema.openapi('AddQuestionDto');

registry.register('CreateQuizDto', createQuizSchema);
registry.register('AddQuestionDto', addQuestionSchema);

export type CreateQuizDto = z.infer<typeof createQuizSchema>;
