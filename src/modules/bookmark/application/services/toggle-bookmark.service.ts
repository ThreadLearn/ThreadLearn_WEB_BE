import { Inject, Injectable } from '@nestjs/common';
import { BadRequestError } from '../../../../common/custom-error';
import {
  ILearningAccess,
  LEARNING_ACCESS,
} from '../../../../shared/domain/interfaces/learning-access.port';
import { BookmarkEntity } from '../../domain/entities/bookmark.entity';
import { BOOKMARK_REPOSITORY, IBookmarkRepository } from '../../domain/interfaces/bookmark.repository';
import { ToggleBookmarkDto } from '../dto/bookmark.dto';

const isObjectId = (value: string) => /^[a-fA-F0-9]{24}$/.test(value);

@Injectable()
export class ToggleBookmarkService {
  constructor(
    @Inject(BOOKMARK_REPOSITORY) private readonly bookmarks: IBookmarkRepository,
    @Inject(LEARNING_ACCESS) private readonly learningAccess: ILearningAccess,
  ) {}

  async execute(userId: string, dto: ToggleBookmarkDto) {
    if (!isObjectId(dto.targetId)) throw new BadRequestError('Invalid targetId format.');
    if (dto.targetType === 'LESSON') {
      await this.learningAccess.assertLessonViewAccess(dto.targetId, { id: userId, role: 'STUDENT' });
    }
    return this.bookmarks.toggle(
      BookmarkEntity.createNew({
        userId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        title: dto.title,
        thumbnailUrl: dto.thumbnailUrl,
        anchorText: dto.anchorText,
        position: dto.position,
        note: dto.note,
        folder: dto.folder,
        tags: dto.tags,
      }),
    );
  }
}
