import { z } from '../../common/zod/z';

const objectId = /^[a-fA-F0-9]{24}$/;

export const lessonIdQuerySchema = z.object({
  lessonId: z.string().regex(objectId, 'Invalid lesson id.'),
});

export const createVideoBookmarkSchema = z.object({
  lessonId: z.string().regex(objectId, 'Invalid lesson id.'),
  timestampSeconds: z.number().finite().min(0),
  note: z.string().trim().max(280).optional(),
});

export const videoBookmarkIdSchema = z.string().regex(objectId, 'Invalid video bookmark id.');

export type LessonIdQueryDto = z.infer<typeof lessonIdQuerySchema>;
export type CreateVideoBookmarkDto = z.infer<typeof createVideoBookmarkSchema>;
