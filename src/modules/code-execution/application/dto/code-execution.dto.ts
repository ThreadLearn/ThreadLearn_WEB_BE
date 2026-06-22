import { z } from '../../../../common/zod/z';

export const runCodeSchema = z.object({
  sourceCode: z.string().min(1).max(50000),
  language: z.string().optional(),
  languageId: z.number().int().positive().optional(),
  stdin: z.string().max(10000).optional(),
  courseId: z.string().optional(),
  lessonId: z.string().optional(),
  exerciseId: z.string().optional(),
});

export type CodeSubmitPayload = z.infer<typeof runCodeSchema>;
