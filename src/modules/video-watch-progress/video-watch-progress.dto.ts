import { z } from '../../common/zod/z';

const objectId = /^[a-fA-F0-9]{24}$/;

export const lessonIdQuerySchema = z.object({
  lessonId: z.string().regex(objectId, 'Invalid lesson id.'),
});

export const saveVideoWatchProgressSchema = z.object({
  lessonId: z.string().regex(objectId, 'Invalid lesson id.'),
  currentTimeSeconds: z.number().finite().min(0),
  durationSeconds: z.number().finite().positive().optional(),
});

export type LessonIdQueryDto = z.infer<typeof lessonIdQuerySchema>;
export type SaveVideoWatchProgressDto = z.infer<typeof saveVideoWatchProgressSchema>;
