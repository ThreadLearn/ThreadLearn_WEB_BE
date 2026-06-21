import { Types } from 'mongoose';
import { ILessonVersion } from '../../models/lesson-version.model';
import { LessonVersionEntity, LessonVersionProps } from '../../domain/entities/lesson-version.entity';

export class LessonVersionMapper {
  static toEntity(doc: ILessonVersion): LessonVersionEntity {
    const props: LessonVersionProps = {
      id: String(doc._id ?? (doc as any).id),
      lessonId: String(doc.lessonId),
      version: doc.version,
      contentMarkdown: doc.contentMarkdown ?? '',
      createdBy: doc.createdBy ? String(doc.createdBy) : undefined,
      createdAt: doc.createdAt,
    };
    return LessonVersionEntity.fromPersistence(props);
  }

  static toPersistence(entity: LessonVersionEntity): Record<string, any> {
    const p = entity.toProps();
    return {
      lessonId: Types.ObjectId.isValid(p.lessonId) ? new Types.ObjectId(p.lessonId) : p.lessonId,
      version: p.version,
      contentMarkdown: p.contentMarkdown,
      createdBy:
        p.createdBy && Types.ObjectId.isValid(p.createdBy) ? new Types.ObjectId(p.createdBy) : undefined,
    };
  }
}
