import { AuthenticatedNextRequest } from '../../../common/api-handler';
import { ApiResponse } from '../../../common/api-response';
import { NoteService } from '../services/note.service';
import { BadRequestError } from '../../../common/custom-error';

export class NoteController {
  static async getNotes(req: AuthenticatedNextRequest) {
    const { id: userId } = req.user!;
    const lessonId = req.nextUrl.searchParams.get('lessonId') || '';

    if (!lessonId) {
      throw new BadRequestError('lessonId query parameter is required.');
    }

    const notes = await NoteService.getMyNotesInLesson(userId, lessonId);

    return ApiResponse.success({
      message: 'Notes fetched successfully.',
      data: notes,
    });
  }

  static async createNote(req: AuthenticatedNextRequest) {
    const { id: userId } = req.user!;
    const body = await req.json();

    const note = await NoteService.createNote(userId, {
      lessonId: body.lessonId,
      anchorText: body.anchorText,
      anchorStart: body.anchorStart,
      anchorEnd: body.anchorEnd,
      noteContent: body.noteContent,
    });

    return ApiResponse.success({
      message: 'Note created successfully.',
      data: note,
      statusCode: 201,
    });
  }

  static async updateNote(
    req: AuthenticatedNextRequest,
    { params }: { params: { noteId: string } }
  ) {
    const { id: userId } = req.user!;
    const { noteContent } = await req.json();

    const note = await NoteService.updateNote(userId, params.noteId, noteContent);

    return ApiResponse.success({
      message: 'Note updated successfully.',
      data: note,
    });
  }

  static async deleteNote(
    req: AuthenticatedNextRequest,
    { params }: { params: { noteId: string } }
  ) {
    const { id: userId } = req.user!;

    await NoteService.deleteNote(userId, params.noteId);

    return ApiResponse.success({
      message: 'Note deleted successfully.',
    });
  }
}

export default NoteController;
