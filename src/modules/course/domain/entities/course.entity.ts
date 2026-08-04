import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import {
  CourseLanguage,
  CourseLevel,
  CourseStatus,
  RESTORE_WINDOW_MS,
  isPubliclyVisible,
} from '../value-objects/course-status.vo';

/** Toàn bộ trạng thái của 1 Course (đã tách khỏi Mongoose — không import gì của hạ tầng). */
export interface CourseProps {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription?: string;
  thumbnailUrl?: string;
  language: CourseLanguage;
  level: CourseLevel;
  tags: string[];
  category?: string;
  isPremium: boolean;
  price: number;
  status: CourseStatus;
  prerequisites: string[];
  prerequisiteThreshold: number;
  estimatedDuration: number;
  totalLessons: number;
  totalEnrollments: number;
  averageRating: number;
  totalReviews: number;
  instructorId?: string;
  createdBy?: string;
  publishedAt?: Date;
  deletedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Các field admin được phép chỉnh (title xử lý riêng vì kéo theo slug). */
export interface CourseEditableProps {
  description?: string;
  shortDescription?: string;
  thumbnailUrl?: string;
  language?: CourseLanguage;
  level?: CourseLevel;
  tags?: string[];
  category?: string;
  isPremium?: boolean;
  price?: number;
  prerequisites?: string[];
  prerequisiteThreshold?: number;
  estimatedDuration?: number;
}

export interface CreateCourseEntityInput {
  title: string;
  slug: string;
  description: string;
  shortDescription?: string;
  thumbnailUrl?: string;
  language?: CourseLanguage;
  level?: CourseLevel;
  tags?: string[];
  category?: string;
  isPremium?: boolean;
  price?: number;
  prerequisites?: string[];
  prerequisiteThreshold?: number;
  estimatedDuration?: number;
  status?: CourseStatus;
  instructorId?: string;
  createdBy?: string;
}

/**
 * Course aggregate — chứa MỌI business rule (publish guard, soft-delete, restore window…).
 * Tầng application chỉ điều phối; tầng infrastructure chỉ lưu/đọc. Đây là "trái tim" sạch.
 */
export class CourseEntity {
  private constructor(private readonly props: CourseProps) {}

  /** Dựng entity từ dữ liệu đã lưu (mapper gọi). */
  static fromPersistence(props: CourseProps): CourseEntity {
    return new CourseEntity(props);
  }

  /** Tạo course mới (status mặc định 'draft'). Slug do application tính trước rồi truyền vào. */
  static createNew(input: CreateCourseEntityInput): CourseEntity {
    if (!input.title?.trim() || !input.description?.trim()) {
      throw DomainError.badRequest(ErrorCode.COURSE_INVALID_INPUT, 'title and description are required.');
    }
    return new CourseEntity({
      id: '',
      title: input.title.trim(),
      slug: input.slug,
      description: input.description,
      shortDescription: input.shortDescription,
      thumbnailUrl: input.thumbnailUrl,
      language: input.language ?? 'javascript',
      level: input.level ?? 'BEGINNER',
      tags: input.tags ?? [],
      category: input.category,
      isPremium: !!input.isPremium,
      price: input.price ?? 0,
      status: input.status ?? 'draft',
      prerequisites: (input.prerequisites ?? []).filter(Boolean),
      prerequisiteThreshold: input.prerequisiteThreshold ?? 80,
      estimatedDuration: input.estimatedDuration ?? 0,
      totalLessons: 0,
      totalEnrollments: 0,
      averageRating: 0,
      totalReviews: 0,
      instructorId: input.instructorId || undefined,
      createdBy: input.createdBy,
    });
  }

  get id(): string { return this.props.id; }
  get slug(): string { return this.props.slug; }
  get title(): string { return this.props.title; }
  get status(): CourseStatus { return this.props.status; }
  get isDeleted(): boolean { return this.props.status === 'deleted'; }

  setSlug(slug: string): void {
    this.props.slug = slug;
  }

  /** Đổi tên; trả về true nếu cần sinh lại slug (đổi tên khi vẫn là draft). */
  rename(title: string): boolean {
    const next = title.trim();
    if (!next) return false;
    const needsNewSlug = next !== this.props.title && this.props.status === 'draft';
    this.props.title = next;
    return needsNewSlug;
  }

  applyEdits(patch: CourseEditableProps): void {
    const p = this.props;
    if (patch.description !== undefined) p.description = patch.description;
    if (patch.shortDescription !== undefined) p.shortDescription = patch.shortDescription;
    if (patch.thumbnailUrl !== undefined) p.thumbnailUrl = patch.thumbnailUrl;
    if (patch.language !== undefined) p.language = patch.language;
    if (patch.level !== undefined) p.level = patch.level;
    if (patch.tags !== undefined) p.tags = patch.tags;
    if (patch.category !== undefined) p.category = patch.category;
    if (patch.isPremium !== undefined) p.isPremium = patch.isPremium;
    if (patch.price !== undefined) p.price = patch.price;
    if (patch.prerequisiteThreshold !== undefined) p.prerequisiteThreshold = patch.prerequisiteThreshold;
    if (patch.estimatedDuration !== undefined) p.estimatedDuration = patch.estimatedDuration;
    if (patch.prerequisites !== undefined) p.prerequisites = patch.prerequisites.filter(Boolean);
  }

  /** Ownership is separate from editable course metadata. `undefined` means unassigned. */
  assignInstructor(instructorId?: string): void {
    this.props.instructorId = instructorId || undefined;
  }

  /** BR: chỉ publish được khi có ≥ 1 lesson active. Số lesson do port cung cấp. */
  publish(activeLessonCount: number): void {
    if (activeLessonCount <= 0) {
      throw DomainError.badRequest(
        ErrorCode.COURSE_NOT_PUBLISHABLE,
        'Course must contain at least one active lesson before publishing.',
      );
    }
    this.props.status = 'published';
    if (!this.props.publishedAt) this.props.publishedAt = new Date();
  }

  hide(): void {
    this.props.status = 'hidden';
  }

  toDraft(): void {
    this.props.status = 'draft';
  }

  /** Xoá mềm: còn học viên → archived (giữ data), chưa ai học → deleted. */
  softDelete(): void {
    this.props.status = this.props.totalEnrollments > 0 ? 'archived' : 'deleted';
    this.props.deletedAt = new Date();
  }

  restore(now: Date): void {
    if (this.props.deletedAt && now.getTime() - this.props.deletedAt.getTime() > RESTORE_WINDOW_MS) {
      throw DomainError.forbidden(ErrorCode.COURSE_RESTORE_WINDOW_EXPIRED, 'Restore window expired (30 days).');
    }
    this.props.status = 'draft';
    this.props.deletedAt = undefined;
  }

  /** Guard hiển thị chi tiết cho viewer (chưa gồm enrollment — bổ sung ở Phase 2/5). */
  ensureViewableBy(viewerRole?: string): void {
    if (viewerRole === 'ADMIN') return;
    if (isPubliclyVisible(this.props.status)) return;
    // hidden/archived: enrolled students are handled by learning access policy.
    if (this.props.status === 'hidden' || this.props.status === 'archived') return;
    throw DomainError.notFound(ErrorCode.COURSE_NOT_FOUND, 'Course not found.');
  }

  /** Snapshot bất biến để mapper/presenter đọc (không lộ tham chiếu nội bộ). */
  toProps(): CourseProps {
    return { ...this.props };
  }
}
