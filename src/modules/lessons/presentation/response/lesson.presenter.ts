import { LessonEntity } from '../../domain/entities/lesson.entity';

/** Shape bài học trả cho FE — giữ field legacy (`content`, `order`, `attachmentUrl`, `_id`). */
export interface LessonResponse {
  _id: string;
  id: string;
  courseId: string;
  sectionId?: string;
  title: string;
  slug?: string;
  description?: string;
  contentMarkdown?: string;
  lessonType: string;
  videoUrl?: string;
  attachments: string[];
  codeSnippets: { language: string; code: string; description?: string }[];
  orderIndex: number;
  estimatedTime: number;
  isPreview: boolean;
  isLocked: boolean;
  status: string;
  currentVersionId?: string;
  deletedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  // legacy mirrors
  /** @deprecated Use `contentMarkdown`; kept until FE migrates. */
  content?: string;
  /** @deprecated Use `orderIndex`; kept until FE migrates. */
  order?: number;
  /** @deprecated Use `attachments`; kept until FE migrates. */
  attachmentUrl?: string;
}

export class LessonPresenter {
  static toResponse(lesson: LessonEntity): LessonResponse {
    const p = lesson.toProps();
    const attachments = p.attachments ?? [];
    return {
      _id: p.id,
      id: p.id,
      courseId: p.courseId,
      sectionId: p.sectionId,
      title: p.title,
      slug: p.slug,
      description: p.description,
      contentMarkdown: p.contentMarkdown,
      lessonType: p.lessonType,
      videoUrl: p.videoUrl,
      attachments,
      codeSnippets: p.codeSnippets,
      orderIndex: p.orderIndex,
      estimatedTime: p.estimatedTime,
      isPreview: p.isPreview,
      isLocked: p.isLocked,
      status: p.status,
      currentVersionId: p.currentVersionId,
      deletedAt: p.deletedAt,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      content: p.contentMarkdown,
      order: p.orderIndex,
      attachmentUrl: attachments.length ? attachments[attachments.length - 1] : undefined,
    };
  }

  /** Danh sách: bỏ nội dung markdown nặng (giữ đúng hành vi `.select('-contentMarkdown -content')`). */
  static toListItem(lesson: LessonEntity): Omit<LessonResponse, 'contentMarkdown' | 'content'> {
    const { contentMarkdown: _c, content: _c2, ...rest } = LessonPresenter.toResponse(lesson);
    return rest;
  }

  static toList(lessons: LessonEntity[]) {
    return lessons.map((l) => LessonPresenter.toListItem(l));
  }
}
