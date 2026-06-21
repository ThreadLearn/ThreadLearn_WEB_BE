import { z } from 'zod';

export const toggleBookmarkSchema = z.object({
  targetType:   z.enum(['COURSE', 'LESSON']),
  targetId:     z.string().min(1, 'targetId is required.'),
  title:        z.string().min(1, 'title is required.'),
  thumbnailUrl: z.string().optional(),
});

export const myBookmarksQuerySchema = z.object({
  page:       z.coerce.number().int().min(1).default(1),
  limit:      z.coerce.number().int().min(1).max(50).default(10),
  targetType: z.enum(['COURSE', 'LESSON']).optional(),
});

export const checkBookmarkQuerySchema = z.object({
  targetType: z.enum(['COURSE', 'LESSON']),
  targetId:   z.string().min(1),
});
