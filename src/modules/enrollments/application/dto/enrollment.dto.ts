import { z } from 'zod';

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ObjectId format.');

export const enrollCourseSchema = z.object({
  courseId: objectId,
});
export type EnrollCourseDto = z.infer<typeof enrollCourseSchema>;

export const lessonProgressSchema = z.object({
  lessonId: objectId,
});
export type LessonProgressDto = z.infer<typeof lessonProgressSchema>;

export const courseIdParamSchema = objectId;
export const lessonIdParamSchema = objectId;
