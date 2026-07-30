import { z } from '../../../../common/zod/z';

export const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id format.');

export const createCodeShareSchema = z.object({
  sourceExecutionId: objectIdSchema,
  targetType: z.enum(['COURSE', 'LESSON']),
  targetId: objectIdSchema,
  visibility: z.enum(['COURSE', 'CLASS']).optional().default('COURSE'),
});

export const codeShareIdParamSchema = objectIdSchema;
export type CreateCodeShareDto = z.infer<typeof createCodeShareSchema>;
