// src/modules/quiz/dto/question.dto.ts

import { z } from '../../../common/zod/z';
import { QUIZ_LIMITS } from '../constants/quiz.constant';

export const questionSchema = z.object({
  questionText: z.string()
    .min(1, 'Question text is required.')
    .openapi({ example: 'What is a race condition?' }),
  options: z
    .array(z.string().min(1, 'Option cannot be empty.'))
    .min(QUIZ_LIMITS.OPTIONS_MIN, `At least ${QUIZ_LIMITS.OPTIONS_MIN} options are required.`)
    .max(QUIZ_LIMITS.OPTIONS_MAX, `Maximum ${QUIZ_LIMITS.OPTIONS_MAX} options allowed.`)
    .openapi({ example: ['Option A', 'Option B', 'Option C'] }),
  correctAnswerIndex: z.number()
    .int()
    .min(QUIZ_LIMITS.CORRECT_ANSWER_INDEX_MIN, `Index must be >= ${QUIZ_LIMITS.CORRECT_ANSWER_INDEX_MIN}`)
    .openapi({ example: 0 }),
}).refine(
  (q) => q.correctAnswerIndex < q.options.length,
  { message: 'correctAnswerIndex must be less than options length.' }
);

export type QuestionDto = z.infer<typeof questionSchema>;
