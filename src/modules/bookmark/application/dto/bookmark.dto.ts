import { z } from '../../../../common/zod/z';

export const toggleBookmarkSchema = z.object({
  targetType: z.enum(['COURSE', 'LESSON']),
  targetId: z.string().min(1, 'targetId is required.'),
  title: z.string().min(1, 'title is required.'),
  thumbnailUrl: z.string().optional(),
  anchorText: z.string().optional(),
  position: z.number().optional(),
  note: z.string().optional(),
  folder: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const myBookmarksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  targetType: z.enum(['COURSE', 'LESSON']).optional(),
});

export const checkBookmarkQuerySchema = z.object({
  targetType: z.enum(['COURSE', 'LESSON']),
  targetId: z.string().min(1),
});

export type ToggleBookmarkDto = z.infer<typeof toggleBookmarkSchema>;
export type MyBookmarksQueryDto = z.infer<typeof myBookmarksQuerySchema>;
export type CheckBookmarkQueryDto = z.infer<typeof checkBookmarkQuerySchema>;
