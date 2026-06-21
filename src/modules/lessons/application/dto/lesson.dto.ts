import { z } from '../../../../common/zod/z';

export const lessonTypeSchema = z.enum(['article', 'video', 'coding', 'quiz', 'assignment', 'mixed']);

export const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id.');
export const lessonIdParamSchema = objectIdSchema;

const codeSnippetSchema = z.object({
  language: z.string(),
  code: z.string(),
  description: z.string().optional(),
});

export const createLessonSchema = z.object({
  courseId: objectIdSchema,
  sectionId: objectIdSchema.optional(),
  title: z.string().min(1, 'title is required.'),
  description: z.string().optional(),
  contentMarkdown: z.string().optional(),
  lessonType: lessonTypeSchema.optional(),
  videoUrl: z.string().optional(),
  attachments: z.array(z.string()).optional(),
  codeSnippets: z.array(codeSnippetSchema).optional(),
  orderIndex: z.number().optional(),
  estimatedTime: z.number().min(0).optional(),
  isPreview: z.boolean().optional(),
  isLocked: z.boolean().optional(),
});

export const updateLessonSchema = createLessonSchema.partial();

export const setLockSchema = z.object({
  locked: z.boolean().optional(),
});

export type CreateLessonDto = z.infer<typeof createLessonSchema>;
export type UpdateLessonDto = z.infer<typeof updateLessonSchema>;
export type SetLockDto = z.infer<typeof setLockSchema>;
