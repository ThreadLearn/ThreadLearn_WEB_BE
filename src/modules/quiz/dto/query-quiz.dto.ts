// src/modules/quiz/dto/query-quiz.dto.ts

import { z } from '../../../common/zod/z';
import { registry } from '../../../common/zod/openapi.registry';
import { QuizStatus } from '../enums/quiz-status.enum';
import { QUIZ_PAGINATION } from '../constants/quiz.constant';

export const queryQuizSchema = z.object({
  page: z.coerce.number().int().positive()
    .default(QUIZ_PAGINATION.PAGE_DEFAULT)
    .openapi({ example: QUIZ_PAGINATION.PAGE_DEFAULT }),
  limit: z.coerce.number().int().positive()
    .max(QUIZ_PAGINATION.LIMIT_MAX)
    .default(QUIZ_PAGINATION.LIMIT_DEFAULT)
    .openapi({ example: QUIZ_PAGINATION.LIMIT_DEFAULT }),
  search: z.string().optional()
    .openapi({ example: 'event loop' }),
  lessonId: z.string().optional()
    .openapi({ example: '665f1b2c3d4e5f6a7b8c9d0e' }),
  status: z.nativeEnum(QuizStatus).optional()
    .openapi({ example: QuizStatus.PUBLISHED }),
}).openapi('QueryQuizDto');

registry.register('QueryQuizDto', queryQuizSchema);

export type QueryQuizDto = z.infer<typeof queryQuizSchema>;
