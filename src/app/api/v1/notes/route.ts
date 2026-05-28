import { apiHandler } from '@/common/api-handler';
import { NoteController } from '@/modules/note/controllers/note.controller';
import { createNoteSchema } from '@/modules/note/validators/note.validator';

export const GET = apiHandler(NoteController.getNotes, {
  requireAuth: true,
  allowedRoles: ['STUDENT'],
});

export const POST = apiHandler(NoteController.createNote, {
  requireAuth: true,
  allowedRoles: ['STUDENT'],
  schema: createNoteSchema,
});
