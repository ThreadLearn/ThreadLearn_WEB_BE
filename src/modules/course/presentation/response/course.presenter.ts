import { CourseEntity } from '../../domain/entities/course.entity';

/** Shape khoá học trả cho FE — giữ field legacy (`isPublished`, `coverImage`, `_id`) để không phá FE. */
export interface CourseResponse {
  _id: string;
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription?: string;
  thumbnailUrl?: string;
  language: string;
  level: string;
  tags: string[];
  category?: string;
  isPremium: boolean;
  price: number;
  status: string;
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
  // legacy mirrors (FE cũ vẫn đọc) — suy ra từ nguồn sự thật
  isPublished: boolean;
  coverImage?: string;
}

/** Map Entity → shape API. Tập trung mọi field legacy ở đây, không rải khắp service. */
export class CoursePresenter {
  static toResponse(course: CourseEntity): CourseResponse {
    const p = course.toProps();
    return {
      _id: p.id,
      id: p.id,
      title: p.title,
      slug: p.slug,
      description: p.description,
      shortDescription: p.shortDescription,
      thumbnailUrl: p.thumbnailUrl,
      language: p.language,
      level: p.level,
      tags: p.tags,
      category: p.category,
      isPremium: p.isPremium,
      price: p.price,
      status: p.status,
      prerequisites: p.prerequisites,
      prerequisiteThreshold: p.prerequisiteThreshold,
      estimatedDuration: p.estimatedDuration,
      totalLessons: p.totalLessons,
      totalEnrollments: p.totalEnrollments,
      averageRating: p.averageRating,
      totalReviews: p.totalReviews,
      instructorId: p.instructorId,
      createdBy: p.createdBy,
      publishedAt: p.publishedAt,
      deletedAt: p.deletedAt,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      isPublished: p.status === 'published',
      coverImage: p.thumbnailUrl,
    };
  }

  static toList(courses: CourseEntity[]): CourseResponse[] {
    return courses.map((c) => CoursePresenter.toResponse(c));
  }
}
