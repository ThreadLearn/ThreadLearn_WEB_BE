import { z } from 'zod';

export const createNoteSchema = z.object({
  lessonId: z.string().min(1, 'lessonId is required.'),
  anchorText: z.string().min(1, 'anchorText is required.'),
  anchorStart: z.number().int().min(0, 'anchorStart must be a non-negative integer.'),
  anchorEnd: z.number().int().min(1, 'anchorEnd must be greater than 0.'),
  noteContent: z.string().min(1, 'noteContent is required.').max(5000, 'noteContent must be at most 5000 characters.'),
});

export const updateNoteSchema = z.object({
  noteContent: z.string().min(1, 'noteContent is required.').max(5000, 'noteContent must be at most 5000 characters.'),
});
