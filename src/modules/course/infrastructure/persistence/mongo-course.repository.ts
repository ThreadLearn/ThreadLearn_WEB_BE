import { Injectable } from '@nestjs/common';
import mongoose from 'mongoose';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import { PaginationParams } from '../../../../shared/http/pagination';
import { Course } from '../../../courses/models/course.model';
import { CourseEntity } from '../../domain/entities/course.entity';
import {
  CourseListFilter,
  ICourseRepository,
} from '../../domain/interfaces/course.repository';
import { CourseMapper } from '../mapper/course.mapper';

/** Adapter: hiện thực ICourseRepository bằng Mongoose model `Course` hiện có. */
@Injectable()
export class MongoCourseRepository implements ICourseRepository {
  async findById(id: string): Promise<CourseEntity | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await Course.findById(id);
    return doc ? CourseMapper.toEntity(doc) : null;
  }

  async findByIdOrSlug(value: string): Promise<CourseEntity | null> {
    const doc = mongoose.isValidObjectId(value)
      ? await Course.findById(value)
      : await Course.findOne({ slug: value });
    return doc ? CourseMapper.toEntity(doc) : null;
  }

  async isSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
    const doc = await Course.findOne({ slug }).select('_id');
    if (!doc) return false;
    return excludeId ? String(doc._id) !== excludeId : true;
  }

  async list(
    filter: CourseListFilter,
    pagination: PaginationParams,
  ): Promise<{ items: CourseEntity[]; total: number }> {
    const mongoFilter = this.buildMongoFilter(filter);
    const skip = (pagination.page - 1) * pagination.limit;
    const sort = filter.keyword ? { score: { $meta: 'textScore' } } : { createdAt: -1 };

    const [docs, total] = await Promise.all([
      Course.find(mongoFilter).skip(skip).limit(pagination.limit).sort(sort as any),
      Course.countDocuments(mongoFilter),
    ]);
    return { items: docs.map((d) => CourseMapper.toEntity(d)), total };
  }

  async create(course: CourseEntity): Promise<CourseEntity> {
    const doc = await Course.create(CourseMapper.toPersistence(course));
    return CourseMapper.toEntity(doc);
  }

  async update(course: CourseEntity): Promise<CourseEntity> {
    const doc = await Course.findByIdAndUpdate(course.id, CourseMapper.toPersistence(course), { new: true });
    if (!doc) throw DomainError.notFound(ErrorCode.COURSE_NOT_FOUND, 'Course not found.');
    return CourseMapper.toEntity(doc);
  }

  /** Dịch CourseListFilter (ngôn ngữ domain) sang câu query Mongo. */
  private buildMongoFilter(filter: CourseListFilter): Record<string, any> {
    const f: Record<string, any> = {};
    // Bảo mật: chỉ ADMIN (includeAll) mới được lọc theo status tuỳ ý; còn lại chỉ thấy published.
    if (!filter.includeAll) {
      f.status = { $in: ['published'] };
    } else if (filter.status) {
      f.status = filter.status;
    }

    if (filter.keyword) f.$text = { $search: filter.keyword };
    if (filter.level) f.level = filter.level;
    if (filter.language) f.language = filter.language;
    if (filter.tag) f.tags = filter.tag;
    if (filter.category) f.category = filter.category;
    if (typeof filter.isPremium === 'boolean') f.isPremium = filter.isPremium;
    if (typeof filter.minPrice === 'number') f.price = { ...(f.price || {}), $gte: filter.minPrice };
    if (typeof filter.maxPrice === 'number') f.price = { ...(f.price || {}), $lte: filter.maxPrice };
    return f;
  }
}
