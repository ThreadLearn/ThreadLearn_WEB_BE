import { PaginationParams } from '../../../../shared/http/pagination';
import { CourseEntity } from '../entities/course.entity';
import { CourseLanguage, CourseLevel, CourseStatus } from '../value-objects/course-status.vo';

/** Bộ lọc danh sách khoá học (ngôn ngữ domain, không dính cú pháp Mongo). */
export interface CourseListFilter {
  /** true = bỏ giới hạn 'chỉ published' (chỉ ADMIN). */
  includeAll?: boolean;
  status?: CourseStatus;
  keyword?: string;
  level?: CourseLevel;
  language?: CourseLanguage;
  tag?: string;
  category?: string;
  isPremium?: boolean;
  minPrice?: number;
  maxPrice?: number;
}

/**
 * PORT: hợp đồng truy cập dữ liệu Course. Tầng application chỉ biết interface này,
 * không biết Mongoose. Adapter (infrastructure) sẽ hiện thực.
 */
export interface ICourseRepository {
  findById(id: string): Promise<CourseEntity | null>;
  findByIdOrSlug(value: string): Promise<CourseEntity | null>;
  isSlugTaken(slug: string, excludeId?: string): Promise<boolean>;
  list(filter: CourseListFilter, pagination: PaginationParams): Promise<{ items: CourseEntity[]; total: number }>;
  create(course: CourseEntity): Promise<CourseEntity>;
  update(course: CourseEntity): Promise<CourseEntity>;
  incrementEnrollmentCount(courseId: string): Promise<void>;
}

/** DI token cho `ICourseRepository`. */
export const COURSE_REPOSITORY = Symbol('COURSE_REPOSITORY');
