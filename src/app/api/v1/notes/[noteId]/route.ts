import { apiHandler } from '@/common/api-handler';
import { NoteController } from '@/modules/note/controllers/note.controller';
import { updateNoteSchema } from '@/modules/note/validators/note.validator';

export const PATCH = apiHandler(NoteController.updateNote, {
  requireAuth: true,
  allowedRoles: ['STUDENT'],
  schema: updateNoteSchema,
});

export const DELETE = apiHandler(NoteController.deleteNote, {
  requireAuth: true,
  allowedRoles: ['STUDENT'],
});
