import { z } from '../../../../common/zod/z';

export const MAX_SOURCE_CODE_BYTES = 50_000;

export const runCodeSchema = z.object({
  sourceCode: z.string().min(1).refine(
    (value) => Buffer.byteLength(value, 'utf8') <= MAX_SOURCE_CODE_BYTES,
    `sourceCode must not exceed ${MAX_SOURCE_CODE_BYTES} UTF-8 bytes.`,
  ),
  language: z.enum(['javascript', 'python']),
  stdin: z.string().max(10000).optional(),
  courseId: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid course id.').optional(),
  lessonId: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid lesson id.').optional(),
});

export const codeExecutionIdParamSchema = z.string().regex(
  /^[a-fA-F0-9]{24}$/,
  'Invalid code execution id.',
);

export const codeExecutionHistoryQuerySchema = z.object({
  lessonId: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid lesson id.').optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CodeExecutionHistoryQuery = z.infer<typeof codeExecutionHistoryQuerySchema>;

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
