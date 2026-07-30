import { z } from '../../../../common/zod/z';

export const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id format.');

export const createCodeShareSchema = z.object({
  sourceExecutionId: objectIdSchema,
  targetType: z.enum(['COURSE', 'LESSON']),
  targetId: objectIdSchema,
  // Class-scoped sharing needs a class identifier and membership ACL. Until
  // that exists, only the verified course audience is a valid visibility.
  visibility: z.literal('COURSE').optional().default('COURSE'),
});

export const codeShareIdParamSchema = objectIdSchema;
export type CreateCodeShareDto = z.infer<typeof createCodeShareSchema>;
