import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import { LessonStatus, LessonType, VERSION_THRESHOLD_CHARS } from '../value-objects/lesson-status.vo';

export interface LessonCodeSnippet {
  language: string;
  code: string;
  description?: string;
}

/** Toàn bộ trạng thái của 1 Lesson (đã tách khỏi Mongoose — domain thuần). */
export interface LessonProps {
  id: string;
  courseId: string;
  sectionId?: string;
  title: string;
  slug?: string;
  description?: string;
  contentMarkdown: string;
  lessonType: LessonType;
  videoUrl?: string;
  attachments: string[];
  codeSnippets: LessonCodeSnippet[];
  orderIndex: number;
  estimatedTime: number;
  isPreview: boolean;
  isLocked: boolean;
  status: LessonStatus;
  currentVersionId?: string;
  deletedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateLessonEntityInput {
  courseId: string;
  sectionId?: string;
  title: string;
  description?: string;
  contentMarkdown?: string;
  lessonType?: LessonType;
  videoUrl?: string;
  attachments?: string[];
  codeSnippets?: LessonCodeSnippet[];
  orderIndex: number;
  estimatedTime?: number;
  isPreview?: boolean;
  isLocked?: boolean;
}

/** Các field admin được phép chỉnh (contentMarkdown xử lý riêng vì kéo theo version). */
export interface LessonEditableProps {
  title?: string;
  description?: string;
  lessonType?: LessonType;
  videoUrl?: string;
  attachments?: string[];
  codeSnippets?: LessonCodeSnippet[];
  estimatedTime?: number;
  sectionId?: string;
  orderIndex?: number;
  isPreview?: boolean;
}

/**
 * Lesson aggregate — chứa MỌI business rule (lock guard, soft-delete, version bump…).
 * Application chỉ điều phối; infrastructure chỉ lưu/đọc.
 */
export class LessonEntity {
  private constructor(private readonly props: LessonProps) {}

  static fromPersistence(props: LessonProps): LessonEntity {
    return new LessonEntity(props);
  }

  /** Tạo bài mới. `orderIndex` do application tính trước (đếm bài hiện có) rồi truyền vào. */
  static createNew(input: CreateLessonEntityInput): LessonEntity {
    if (!input.courseId?.trim()) {
      throw DomainError.badRequest(ErrorCode.LESSON_INVALID_INPUT, 'courseId is required.');
    }
    if (!input.title?.trim()) {
      throw DomainError.badRequest(ErrorCode.LESSON_INVALID_INPUT, 'title is required.');
    }
    const isLocked = !!input.isLocked;
    return new LessonEntity({
      id: '',
      courseId: input.courseId,
      sectionId: input.sectionId,
      title: input.title.trim(),
      description: input.description,
      contentMarkdown: input.contentMarkdown ?? '',
      lessonType: input.lessonType ?? 'article',
      videoUrl: input.videoUrl,
      attachments: input.attachments ?? [],
      codeSnippets: input.codeSnippets ?? [],
      orderIndex: input.orderIndex,
      estimatedTime: input.estimatedTime ?? 0,
      isPreview: !!input.isPreview,
      isLocked,
      status: isLocked ? 'locked' : 'active',
    });
  }

  get id(): string { return this.props.id; }
  get courseId(): string { return this.props.courseId; }
  get title(): string { return this.props.title; }
  get status(): LessonStatus { return this.props.status; }
  get lessonType(): LessonType { return this.props.lessonType; }
  get isLocked(): boolean { return this.props.isLocked; }
  get contentMarkdown(): string { return this.props.contentMarkdown; }
  get isDeleted(): boolean { return this.props.status === 'deleted'; }

  ensureNotDeleted(): void {
    if (this.props.status === 'deleted') {
      throw DomainError.notFound(ErrorCode.LESSON_NOT_FOUND, 'Lesson not found.');
    }
  }

  setCurrentVersion(versionId: string): void {
    this.props.currentVersionId = versionId;
  }

  /** Áp các field chỉnh sửa thông thường (không gồm contentMarkdown). */
  applyEdits(patch: LessonEditableProps): void {
    const p = this.props;
    if (patch.title !== undefined) p.title = patch.title;
    if (patch.description !== undefined) p.description = patch.description;
    if (patch.lessonType !== undefined) p.lessonType = patch.lessonType;
    if (patch.videoUrl !== undefined) p.videoUrl = patch.videoUrl;
    if (patch.attachments !== undefined) p.attachments = patch.attachments;
    if (patch.codeSnippets !== undefined) p.codeSnippets = patch.codeSnippets;
    if (patch.estimatedTime !== undefined) p.estimatedTime = patch.estimatedTime;
    if (patch.sectionId !== undefined) p.sectionId = patch.sectionId || undefined;
    if (patch.orderIndex !== undefined) p.orderIndex = patch.orderIndex;
    if (patch.isPreview !== undefined) p.isPreview = patch.isPreview;
  }

  /**
   * Cập nhật nội dung markdown. Trả về true nếu thay đổi đủ lớn (≥ ngưỡng) → cần tạo version mới.
   */
  changeContent(next: string): boolean {
    const old = this.props.contentMarkdown ?? '';
    this.props.contentMarkdown = next;
    return Math.abs(next.length - old.length) >= VERSION_THRESHOLD_CHARS;
  }

  setLock(locked: boolean): void {
    this.props.isLocked = locked;
    this.props.status = locked ? 'locked' : 'active';
  }

  softDelete(): void {
    this.props.status = 'deleted';
    this.props.deletedAt = new Date();
  }

  addAttachment(url: string): void {
    this.props.attachments = [...(this.props.attachments ?? []), url];
  }

  toProps(): LessonProps {
    return { ...this.props };
  }
}
