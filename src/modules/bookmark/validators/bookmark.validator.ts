import { z } from 'zod';

export const toggleBookmarkSchema = z.object({
  targetType: z.enum(['COURSE', 'LESSON'], { required_error: 'targetType is required.' }),
  targetId: z.string().min(1, 'targetId is required.'),
  title: z.string().min(1, 'title is required.'),
  thumbnailUrl: z.string().optional(),
});
