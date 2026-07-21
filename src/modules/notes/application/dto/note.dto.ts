import { z } from '../../../../common/zod/z';

export const listNotesQuerySchema = z.object({
  lessonId: z.string().min(1).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(12),
});

export const createNoteSchema = z.object({
  lessonId: z.string().min(1),
  noteText: z.string().min(1),
  codeSnippet: z.string().optional(),
  anchorText: z.string().max(1000).optional(),
  anchorStart: z.coerce.number().int().min(0).optional(),
  anchorEnd: z.coerce.number().int().min(0).optional(),
});

export const updateNoteSchema = z.object({
  noteText: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  codeSnippet: z.string().optional(),
  anchorText: z.string().max(1000).optional(),
  anchorStart: z.coerce.number().int().min(0).optional(),
  anchorEnd: z.coerce.number().int().min(0).optional(),
});

export type CreateNoteDto = z.infer<typeof createNoteSchema>;
export type UpdateNoteDto = z.infer<typeof updateNoteSchema>;
export type ListNotesQueryDto = z.infer<typeof listNotesQuerySchema>;
