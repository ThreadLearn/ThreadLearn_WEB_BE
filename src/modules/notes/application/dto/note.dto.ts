import { z } from '../../../../common/zod/z';

export const listNotesQuerySchema = z.object({
  lessonId: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid lesson id.').optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(12),
});

const noteFieldsSchema = z.object({
  noteText: z.string().trim().min(1).max(10000).optional(),
  content: z.string().trim().min(1).max(10000).optional(),
  codeSnippet: z.string().max(50000).optional(),
  anchorText: z.string().max(1000).optional(),
  anchorStart: z.coerce.number().int().min(0).nullable().optional(),
  anchorEnd: z.coerce.number().int().min(0).nullable().optional(),
});

const validateAnchorRange = (
  value: { anchorStart?: number | null; anchorEnd?: number | null },
  context: z.RefinementCtx,
) => {
  const hasStart = value.anchorStart !== undefined && value.anchorStart !== null;
  const hasEnd = value.anchorEnd !== undefined && value.anchorEnd !== null;
  if (hasStart !== hasEnd) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: [value.anchorStart === undefined ? 'anchorStart' : 'anchorEnd'],
      message: 'anchorStart and anchorEnd must be provided together.',
    });
    return;
  }
  if (
    typeof value.anchorStart === 'number' &&
    typeof value.anchorEnd === 'number' &&
    value.anchorEnd <= value.anchorStart
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['anchorEnd'],
      message: 'anchorEnd must be greater than anchorStart.',
    });
  }
};

export const createNoteSchema = noteFieldsSchema.extend({
  lessonId: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid lesson id.'),
  noteText: z.string().trim().min(1).max(10000),
}).superRefine(validateAnchorRange);

export const createLessonNoteSchema = noteFieldsSchema.extend({
  noteText: z.string().trim().min(1).max(10000),
}).superRefine(validateAnchorRange);

export const updateNoteSchema = noteFieldsSchema
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'At least one note field is required.',
  })
  .superRefine(validateAnchorRange);

export const noteIdParamSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid note id.');

export type CreateNoteDto = z.infer<typeof createNoteSchema>;
export type CreateLessonNoteDto = z.infer<typeof createLessonNoteSchema>;
export type UpdateNoteDto = z.infer<typeof updateNoteSchema>;
export type ListNotesQueryDto = z.infer<typeof listNotesQuerySchema>;
