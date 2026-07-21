import { z } from '../../../../common/zod/z';

const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id format.');

export const commentIdParamSchema = objectIdSchema;

export const listCommentsQuerySchema = z.object({
  targetType: z.enum(['COURSE', 'LESSON']),
  targetId: objectIdSchema,
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export const createCommentSchema = z.object({
  targetType: z.enum(['COURSE', 'LESSON']),
  targetId: objectIdSchema,
  content: z.string().min(1).max(2000),
  parentId: objectIdSchema.optional(),
  isAnonymous: z.boolean().optional().default(false),
  mentionUserIds: z.array(objectIdSchema).optional(),
});

export const createReplySchema = z.object({
  content: z.string().min(1).max(2000),
  isAnonymous: z.boolean().optional().default(false),
});

export const updateCommentSchema = z.object({
  content: z.string().min(1).max(2000),
});

export type CreateCommentDto = z.infer<typeof createCommentSchema>;
export type ListCommentsQueryDto = z.infer<typeof listCommentsQuerySchema>;
export type UpdateCommentDto = z.infer<typeof updateCommentSchema>;
export type CreateReplyDto = z.infer<typeof createReplySchema>;
