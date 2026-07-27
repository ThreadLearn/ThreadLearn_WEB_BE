import { z } from '../../../../common/zod/z';

export const runCodeSchema = z.object({
  sourceCode: z.string().min(1).max(50000),
  language: z.enum(['javascript', 'python']),
  stdin: z.string().max(10000).optional(),
  courseId: z.string().optional(),
  lessonId: z.string().optional(),
});

/** Payload accepted from the student-facing /run endpoint. */
export type RunCodePayload = z.infer<typeof runCodeSchema>;

/**
 * Internal execution payload. Exercise grading and protected admin tooling may
 * provide a resolved Judge0 language id; public students never can.
 */
export interface CodeSubmitPayload {
  sourceCode: string;
  language?: string;
  languageId?: number;
  stdin?: string;
  courseId?: string;
  lessonId?: string;
  exerciseId?: string;
}
