import { z } from 'zod';

export const createCommentSchema = z.object({
  targetType: z.enum(['COURSE', 'LESSON'], { required_error: 'targetType is required.' }),
  targetId: z.string().min(1, 'targetId is required.'),
  content: z
    .string()
    .min(1, 'Content is required.')
    .max(2000, 'Content must be at most 2000 characters.'),
  parentId: z.string().optional(),
});

export const updateCommentSchema = z.object({
  content: z
    .string()
    .min(1, 'Content is required.')
    .max(2000, 'Content must be at most 2000 characters.'),
});
