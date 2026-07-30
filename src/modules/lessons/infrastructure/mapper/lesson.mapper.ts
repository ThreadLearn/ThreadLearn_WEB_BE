import { Types } from 'mongoose';
import { ILesson } from '../../models/lesson.model';
import { LessonEntity, LessonProps } from '../../domain/entities/lesson.entity';
import { LessonStatus, LessonType } from '../../domain/value-objects/lesson-status.vo';

/**
 * Cầu nối Entity <-> Mongoose document. NƠI DUY NHẤT biết field legacy
 * (`content`, `order`, `attachmentUrl`): nguồn sự thật = `contentMarkdown`/`orderIndex`/`attachments`.
 */
export class LessonMapper {
  static toEntity(doc: ILesson): LessonEntity {
    const props: LessonProps = {
      id: String(doc._id ?? (doc as any).id),
      courseId: String(doc.courseId),
      sectionId: doc.sectionId ? String(doc.sectionId) : undefined,
      title: doc.title,
      slug: doc.slug,
      description: doc.description,
      contentMarkdown: doc.contentMarkdown ?? doc.content ?? '',
      lessonType: (doc.lessonType ?? 'article') as LessonType,
      videoUrl: doc.videoUrl,
      transcript: doc.transcript,
      transcriptLanguage: doc.transcriptLanguage,
      subtitleTracks: doc.subtitleTracks ?? [],
      attachments: doc.attachments ?? [],
      codeSnippets: (doc.codeSnippets ?? []).map((s) => ({
        language: s.language,
        code: s.code,
        description: s.description,
      })),
      orderIndex: doc.orderIndex ?? doc.order ?? 0,
      estimatedTime: doc.estimatedTime ?? 0,
      isPreview: !!doc.isPreview,
      isLocked: !!doc.isLocked,
      status: (doc.status ?? 'active') as LessonStatus,
      currentVersionId: doc.currentVersionId ? String(doc.currentVersionId) : undefined,
      deletedAt: doc.deletedAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
    return LessonEntity.fromPersistence(props);
  }

  static toPersistence(entity: LessonEntity): Record<string, any> {
    const p = entity.toProps();
    const attachments = p.attachments ?? [];
    return {
      courseId: Types.ObjectId.isValid(p.courseId) ? new Types.ObjectId(p.courseId) : p.courseId,
      sectionId:
        p.sectionId && Types.ObjectId.isValid(p.sectionId)
          ? new Types.ObjectId(p.sectionId)
          : undefined,
      title: p.title,
      slug: p.slug,
      description: p.description,
      contentMarkdown: p.contentMarkdown,
      lessonType: p.lessonType,
      videoUrl: p.videoUrl,
      transcript: p.transcript,
      transcriptLanguage: p.transcriptLanguage,
      subtitleTracks: p.subtitleTracks,
      attachments,
      codeSnippets: p.codeSnippets,
      orderIndex: p.orderIndex,
      estimatedTime: p.estimatedTime,
      isPreview: p.isPreview,
      isLocked: p.isLocked,
      status: p.status,
      currentVersionId:
        p.currentVersionId && Types.ObjectId.isValid(p.currentVersionId)
          ? new Types.ObjectId(p.currentVersionId)
          : undefined,
      deletedAt: p.deletedAt ?? null,
      // legacy mirrors (suy ra, không phải nguồn sự thật)
      content: p.contentMarkdown,
      order: p.orderIndex,
      attachmentUrl: attachments.length ? attachments[attachments.length - 1] : undefined,
    };
  }
}
