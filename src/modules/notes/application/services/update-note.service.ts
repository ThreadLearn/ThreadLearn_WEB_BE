import { Inject, Injectable } from '@nestjs/common';
import { BadRequestError, NotFoundError } from '../../../../common/custom-error';
import { INoteRepository, NOTE_REPOSITORY } from '../../domain/interfaces/note.repository';
import { ILearningAccess, LEARNING_ACCESS } from '../../../../shared/domain/interfaces/learning-access.port';

@Injectable()
export class UpdateNoteService {
  constructor(
    @Inject(NOTE_REPOSITORY) private readonly notes: INoteRepository,
    @Inject(LEARNING_ACCESS) private readonly learningAccess: ILearningAccess,
  ) {}

  async execute(
    userId: string,
    noteId: string,
    input: {
      noteText?: string;
      content?: string;
      codeSnippet?: string;
      anchorText?: string;
      anchorStart?: number;
      anchorEnd?: number;
    }
  ) {
    const note = await this.notes.findOwned(userId, noteId);
    if (!note) throw new NotFoundError('Note not found.');
    if (input.anchorEnd !== undefined) {
      const lesson = await this.learningAccess.assertLessonInteractionAccess(note.lessonId, { id: userId, role: 'STUDENT' });
      if (lesson.contentLength !== undefined && input.anchorEnd > lesson.contentLength) {
        throw new BadRequestError('anchorEnd exceeds lesson content length.');
      }
    }
    note.applyPatch(input);
    return this.notes.update(note);
  }
}
