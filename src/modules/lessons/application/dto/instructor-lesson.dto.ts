import { z } from '../../../../common/zod/z';

const safeUrlSchema = z
  .string()
  .url('Invalid URL format.')
  .refine(
    (url) => /^https?:\/\//i.test(url),
    'URL must use http:// or https:// protocol.',
  );

const subtitleTrackSchema = z.object({
  language: z.string().trim().min(2, 'Language code too short.').max(20, 'Language code too long.'),
  label: z.string().trim().min(1).max(80).optional(),
  url: safeUrlSchema,
});

const codeSnippetSchema = z.object({
  language: z.string().trim().min(1),
  code: z.string(),
  description: z.string().optional(),
});

export const instructorLessonTypeSchema = z.enum(['article', 'video']);

export const createInstructorLessonSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required.').max(200, 'Title is too long.'),
    description: z.string().trim().max(5000).optional(),
    contentMarkdown: z.string().max(200_000).optional(),
    lessonType: instructorLessonTypeSchema,
    videoUrl: safeUrlSchema.optional(),
    transcript: z.string().max(100_000, 'Transcript text exceeds 100,000 characters limit.').optional(),
    transcriptLanguage: z.string().trim().min(2).max(20).optional(),
    subtitleTracks: z.array(subtitleTrackSchema).max(12).optional(),
    codeSnippets: z.array(codeSnippetSchema).max(20).optional(),
    estimatedTime: z.number().min(0).max(1440).optional(),

    // Extra fields explicitly prohibited on create/update for Instructors
    courseId: z.never({ invalid_type_error: 'courseId cannot be passed in request body.' }).optional(),
    sectionId: z.never({ invalid_type_error: 'sectionId cannot be passed in request body.' }).optional(),
    isPreview: z.never({ invalid_type_error: 'isPreview is Admin-only.' }).optional(),
    attachments: z.never({ invalid_type_error: 'attachments cannot be set directly in body. Use attachment upload endpoint.' }).optional(),
    isLocked: z.never({ invalid_type_error: 'isLocked is Admin-only.' }).optional(),
    status: z.never({ invalid_type_error: 'status cannot be altered by instructor.' }).optional(),
  })
  .strict();

export const updateInstructorLessonSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required.').max(200, 'Title is too long.').optional(),
    description: z.string().trim().max(5000).optional(),
    contentMarkdown: z.string().max(200_000).optional(),
    videoUrl: safeUrlSchema.optional(),
    transcript: z.string().max(100_000, 'Transcript text exceeds 100,000 characters limit.').optional(),
    transcriptLanguage: z.string().trim().min(2).max(20).optional(),
    subtitleTracks: z.array(subtitleTrackSchema).max(12).optional(),
    codeSnippets: z.array(codeSnippetSchema).max(20).optional(),
    estimatedTime: z.number().min(0).max(1440).optional(),

    // Prohibited fields on update
    lessonType: z.never({ invalid_type_error: 'lessonType is immutable after creation.' }).optional(),
    courseId: z.never({ invalid_type_error: 'courseId cannot be passed in request body.' }).optional(),
    sectionId: z.never({ invalid_type_error: 'sectionId cannot be passed in request body.' }).optional(),
    isPreview: z.never({ invalid_type_error: 'isPreview is Admin-only.' }).optional(),
    attachments: z.never({ invalid_type_error: 'attachments cannot be set directly in body.' }).optional(),
    isLocked: z.never({ invalid_type_error: 'isLocked is Admin-only.' }).optional(),
    status: z.never({ invalid_type_error: 'status cannot be altered by instructor.' }).optional(),
  })
  .strict();

export const reorderInstructorLessonsSchema = z.object({
  orderedLessonIds: z
    .array(z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid lesson id format.'))
    .min(1, 'orderedLessonIds list cannot be empty.'),
});

export type CreateInstructorLessonDto = z.infer<typeof createInstructorLessonSchema>;
export type UpdateInstructorLessonDto = z.infer<typeof updateInstructorLessonSchema>;
export type ReorderInstructorLessonsDto = z.infer<typeof reorderInstructorLessonsSchema>;
