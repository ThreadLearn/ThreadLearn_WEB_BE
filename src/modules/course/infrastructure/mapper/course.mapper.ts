import { Types } from 'mongoose';
import { ICourse } from '../../../courses/models/course.model';
import { CourseEntity, CourseProps } from '../../domain/entities/course.entity';

/**
 * Cầu nối Entity  <->  Mongoose document.
 * Đây là NƠI DUY NHẤT biết về field legacy (`isPublished`, `coverImage`):
 * single source of truth = `status` / `thumbnailUrl`, các mirror được suy ra khi ghi.
 */
export class CourseMapper {
  static toEntity(doc: ICourse): CourseEntity {
    const props: CourseProps = {
      id: String(doc._id ?? (doc as any).id),
      title: doc.title,
      slug: doc.slug,
      description: doc.description,
      shortDescription: doc.shortDescription,
      thumbnailUrl: doc.thumbnailUrl,
      language: doc.language,
      level: doc.level,
      tags: doc.tags ?? [],
      category: doc.category,
      isPremium: !!doc.isPremium,
      price: doc.price ?? 0,
      status: doc.status,
      prerequisites: (doc.prerequisites ?? []).map((id) => String(id)),
      prerequisiteThreshold: doc.prerequisiteThreshold ?? 80,
      estimatedDuration: doc.estimatedDuration ?? 0,
      totalLessons: doc.totalLessons ?? 0,
      totalEnrollments: doc.totalEnrollments ?? 0,
      averageRating: doc.averageRating ?? 0,
      totalReviews: doc.totalReviews ?? 0,
      instructorId: doc.instructorId ? String(doc.instructorId) : undefined,
      createdBy: doc.createdBy ? String(doc.createdBy) : undefined,
      publishedAt: doc.publishedAt,
      deletedAt: doc.deletedAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
    return CourseEntity.fromPersistence(props);
  }

  /** Trả về object để Course.create / findByIdAndUpdate. Bỏ qua field undefined (mongoose tự giữ giá trị cũ). */
  static toPersistence(entity: CourseEntity): Record<string, any> {
    const p = entity.toProps();
    return {
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
      prerequisites: p.prerequisites
        .filter((id) => Types.ObjectId.isValid(id))
        .map((id) => new Types.ObjectId(id)),
      prerequisiteThreshold: p.prerequisiteThreshold,
      estimatedDuration: p.estimatedDuration,
      publishedAt: p.publishedAt,
      deletedAt: p.deletedAt ?? null,
      createdBy: p.createdBy && Types.ObjectId.isValid(p.createdBy) ? new Types.ObjectId(p.createdBy) : undefined,
      // legacy mirrors (suy ra, không phải nguồn sự thật)
      isPublished: p.status === 'published',
      coverImage: p.thumbnailUrl,
    };
  }
}
