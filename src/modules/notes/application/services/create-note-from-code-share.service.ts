import { Injectable } from '@nestjs/common';
import { BadRequestError, ForbiddenError } from '../../../../common/custom-error';
import { CodeShareService } from '../../../code-share/application/services/code-share.service';
import { Note } from '../../models/note.model';
import { NoteMapper } from '../../infrastructure/mapper/note.mapper';
import { Comment } from '../../../comment/models/comment.model';
import type { UserRole } from '../../../auth/domain/value-objects/user-role.vo';

@Injectable()
export class CreateNoteFromCodeShareService {
  constructor(private readonly codeShares: CodeShareService) {}

  async execute(userId: string, role: UserRole, input: { codeShareId: string; lessonId: string; noteText?: string }) {
    const share = await this.codeShares.getVisible(userId, role, input.codeShareId);
    if (share.isCodeLocked || !share.sourceCode) {
      throw new ForbiddenError('Run this exercise yourself before saving a community code solution.');
    }
    if (!share.lessonId || share.lessonId !== input.lessonId) {
      throw new BadRequestError('Choose the lesson linked to this shared code.');
    }
    const sourceComment = await Comment.findOne({ codeShareId: share._id, status: 'active' })
      .select('_id parentId courseId lessonId')
      .lean();
    if (!sourceComment || String(sourceComment.lessonId ?? '') !== input.lessonId) {
      throw new BadRequestError('The source discussion is no longer available.');
    }
    const sourceCommentId = String(sourceComment._id);
    const sourceDiscussionId = String(sourceComment.parentId ?? sourceComment._id);
    const courseId = String(sourceComment.courseId ?? share.courseId ?? '');
    const noteText = input.noteText?.trim() || `Saved from a community code solution by ${share.author?.name ?? 'a ThreadLearn member'}.`;
    const sourceLink = `/lessons/${input.lessonId}?course=${courseId}&discussion=${sourceDiscussionId}&comment=${sourceCommentId}&codeShare=${share._id}`;
    const note = await Note.findOneAndUpdate(
      { userId, sourceCodeShareId: share._id },
      {
        $setOnInsert: {
          userId,
          lessonId: input.lessonId,
          noteText,
          codeSnippet: share.sourceCode,
          sourceType: 'DISCUSSION_CODE_SHARE',
          sourceCodeShareId: share._id,
          sourceAuthorId: share.authorId,
          sourceAuthorName: share.author?.name,
          sourceLink,
          sourceDiscussionId,
          sourceCommentId,
        },
      },
      { upsert: true, new: true, runValidators: true },
    );
    return NoteMapper.formatView(note);
  }
}
