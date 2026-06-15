// src/modules/quiz/dto/submit-quiz.dto.ts

import { z } from '../../../common/zod/z';
import { registry } from '../../../common/zod/openapi.registry';

// ─── Submit Quiz Schema (Student) ──────────────────────────────
export const quizSubmitSchema = z.object({
  quizId: z.string()
    .min(1, 'Quiz ID is required.')
    .openapi({ example: '665f1b2c3d4e5f6a7b8c9d0e' }),
  answers: z.record(z.coerce.number())
    .openapi({ example: { '0': 1, '1': 2, '2': 0 } }),
}).openapi('QuizSubmitDto');

registry.register('QuizSubmitDto', quizSubmitSchema);

export type QuizSubmitDto = z.infer<typeof quizSubmitSchema>;