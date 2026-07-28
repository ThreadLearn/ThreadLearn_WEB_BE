import { z } from '../../../../common/zod/z';

export const bookmarkMetadataSchema = z.object({
  // Snapshot metadata is resolved on the server from the target. These fields
  // remain optional only so older clients can call the compatibility aliases.
  title: z.string().trim().min(1).max(300).optional(),
  thumbnailUrl: z.string().max(2000).optional(),
  anchorText: z.string().max(1000).optional(),
  position: z.number().int().min(0).optional(),
  note: z.string().max(2000).optional(),
  folder: z.string().max(100).optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
});

export const toggleBookmarkSchema = bookmarkMetadataSchema.extend({
  targetType: z.enum(['COURSE', 'LESSON']),
  targetId: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid targetId.'),
});

export const bookmarkCompatibilitySchema = bookmarkMetadataSchema.extend({
  targetType: z.enum(['COURSE', 'LESSON']).optional(),
  targetId: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid targetId.').optional(),
  lessonId: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid lessonId.').optional(),
}).refine((value) => Boolean(value.targetId ?? value.lessonId), {
  message: 'targetId is required.',
});

export const updateBookmarkSchema = bookmarkMetadataSchema.refine(
  (value) => Object.values(value).some((field) => field !== undefined),
  { message: 'At least one bookmark field is required.' },
);

export const bookmarkIdParamSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid bookmark id.');

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
export type BookmarkCompatibilityDto = z.infer<typeof bookmarkCompatibilitySchema>;
export type UpdateBookmarkDto = z.infer<typeof updateBookmarkSchema>;
