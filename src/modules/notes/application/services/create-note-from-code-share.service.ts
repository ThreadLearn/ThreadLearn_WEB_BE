import { Injectable } from '@nestjs/common';
import { BadRequestError } from '../../../../common/custom-error';
import { CodeShareService } from '../../../code-share/application/services/code-share.service';
import { Note } from '../../models/note.model';
import { NoteMapper } from '../../infrastructure/mapper/note.mapper';

@Injectable()
export class CreateNoteFromCodeShareService {
  constructor(private readonly codeShares: CodeShareService) {}

  async execute(userId: string, role: 'STUDENT' | 'ADMIN', input: { codeShareId: string; lessonId: string; noteText?: string }) {
    const share = await this.codeShares.getVisible(userId, role, input.codeShareId);
    if (!share.lessonId || share.lessonId !== input.lessonId) {
      throw new BadRequestError('Choose the lesson linked to this shared code.');
    }
    const noteText = input.noteText?.trim() || `Saved from a community code solution by ${share.author?.name ?? 'a ThreadLearn member'}.`;
    const note = await Note.create({
      userId,
      lessonId: input.lessonId,
      noteText,
      codeSnippet: share.sourceCode,
      sourceType: 'DISCUSSION_CODE_SHARE',
      sourceCodeShareId: share._id,
      sourceAuthorId: share.authorId,
      sourceAuthorName: share.author?.name,
      sourceLink: `/lessons/${input.lessonId}?codeShare=${share._id}`,
    });
    return NoteMapper.formatView(note);
  }
}
