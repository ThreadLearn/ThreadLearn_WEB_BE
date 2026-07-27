import { z } from '../../../../common/zod/z';

export const listNotesQuerySchema = z.object({
  lessonId: z.string().min(1).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(12),
});

const noteFieldsSchema = z.object({
  noteText: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  codeSnippet: z.string().optional(),
  anchorText: z.string().max(1000).optional(),
  anchorStart: z.coerce.number().int().min(0).optional(),
  anchorEnd: z.coerce.number().int().min(0).optional(),
});

const validateAnchorRange = (value: { anchorStart?: number; anchorEnd?: number }, context: z.RefinementCtx) => {
  if (
    value.anchorStart !== undefined &&
    value.anchorEnd !== undefined &&
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
  lessonId: z.string().min(1),
  noteText: z.string().min(1),
}).superRefine(validateAnchorRange);

export const updateNoteSchema = noteFieldsSchema.superRefine(validateAnchorRange);

export type CreateNoteDto = z.infer<typeof createNoteSchema>;
export type UpdateNoteDto = z.infer<typeof updateNoteSchema>;
export type ListNotesQueryDto = z.infer<typeof listNotesQuerySchema>;
