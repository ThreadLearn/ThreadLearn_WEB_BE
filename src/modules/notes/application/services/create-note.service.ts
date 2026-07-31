import { Inject, Injectable } from '@nestjs/common';
import {
  ILearningAccess,
  LEARNING_ACCESS,
} from '../../../../shared/domain/interfaces/learning-access.port';
import { NoteEntity } from '../../domain/entities/note.entity';
import { INoteRepository, NOTE_REPOSITORY } from '../../domain/interfaces/note.repository';
import { CreateNoteDto } from '../dto/note.dto';
import { BadRequestError } from '../../../../common/custom-error';

@Injectable()
export class CreateNoteService {
  constructor(
    @Inject(NOTE_REPOSITORY) private readonly notes: INoteRepository,
    @Inject(LEARNING_ACCESS) private readonly learningAccess: ILearningAccess
  ) {}

  async execute(userId: string, input: CreateNoteDto) {
    const lesson = await this.learningAccess.assertLessonInteractionAccess(input.lessonId, {
      id: userId,
      role: 'STUDENT',
    });
    if (
      typeof input.anchorEnd === 'number'
      && lesson.contentLength !== undefined
      && input.anchorEnd > lesson.contentLength
    ) {
      throw new BadRequestError('anchorEnd exceeds lesson content length.');
    }
    return this.notes.create(NoteEntity.createNew({ ...input, userId }));
  }
}
