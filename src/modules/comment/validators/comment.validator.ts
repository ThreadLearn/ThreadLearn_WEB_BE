import { z } from 'zod';

export const listCommentsQuerySchema = z.object({
  targetType: z.enum(['COURSE', 'LESSON']),
  targetId:   z.string().min(1, 'targetId is required.'),
  page:       z.coerce.number().int().min(1).default(1),
  limit:      z.coerce.number().int().min(1).max(50).default(10),
});

export const createCommentSchema = z.object({
  targetType: z.enum(['COURSE', 'LESSON']),
  targetId:   z.string().min(1, 'targetId is required.'),
  content:    z.string().min(1, 'Content is required.').max(2000),
  parentId:   z.string().optional(),
  mentionUserIds: z.array(z.string()).optional(),
});

export const updateCommentSchema = z.object({
  content:    z.string().min(1, 'Content is required.').max(2000),
});

export const commentIdParamSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid commentId.');
