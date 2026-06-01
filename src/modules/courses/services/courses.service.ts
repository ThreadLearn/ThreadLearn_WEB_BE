import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import mongoose from 'mongoose';
import { ICourse } from '../models/course.model';
import { ILesson } from '../../lessons/models/lesson.model';
import { IEnrollment } from '../../enrollments/models/enrollment.model';
import { NotFoundError } from '../../../common/custom-error';
import {
  CreateCourseDto, UpdateCourseDto, SearchCourseDto,
} from '../dto/course.dto';

@Injectable()
export class CoursesService {
  constructor(
    @InjectModel('Course')     private courseModel:     Model<ICourse>,
    @InjectModel('Lesson')     private lessonModel:     Model<ILesson>,
    @InjectModel('Enrollment') private enrollmentModel: Model<IEnrollment>,
    @InjectModel('Bookmark')   private bookmarkModel:   Model<any>,
  ) {}

  // ─── UC23 — List & detail ───────────────────────────────────────────────────

  async listCourses(page = 1, limit = 10, search = '') {
    return this.searchCourses({ q: search, page, limit });
  }

  /**
   * UC24 — Search / Filter.
   * Uses text index ($text). When Atlas vector search is provisioned, swap
   * the pipeline to `$vectorSearch` against `description_embedding`.
   */
  async searchCourses(params: SearchCourseDto & { includeUnpublished?: boolean }) {
    const page  = Math.max(1, params.page  ?? 1);
    const limit = Math.min(50, Math.max(1, params.limit ?? 12));
    const skip  = (page - 1) * limit;

    const query: FilterQuery<ICourse> = { isDeleted: false };
    if (!params.includeUnpublished) query.isPublished = true;
    if (params.level)    query.level    = params.level;
    if (params.category) query.category = params.category;
    if (params.tag)      query.tags     = params.tag;
    if (params.minPrice != null || params.maxPrice != null) {
      query.price = {};
      if (params.minPrice != null) (query.price as any).$gte = params.minPrice;
      if (params.maxPrice != null) (query.price as any).$lte = params.maxPrice;
    }
    if (params.q?.trim()) {
      query.$text = { $search: params.q.trim() };
    }

    const hasText = !!params.q?.trim();
    const projection: any = hasText ? { score: { $meta: 'textScore' } } : undefined;
    const sort:       any = hasText
      ? { score: { $meta: 'textScore' } }
      : { createdAt: -1 };

    const [courses, total] = await Promise.all([
      this.courseModel.find(query, projection)
        .sort(sort).skip(skip).limit(limit)
        .populate('instructorId', 'firstName lastName avatarUrl')
        .lean(),
      this.courseModel.countDocuments(query),
    ]);

    return {
      data: courses,
      page, limit, total,
      totalPages: Math.ceil(total / limit),
      hasMore:    skip + courses.length < total,
    };
  }

  async getCourseDetail(
    courseId: string,
    opts: { viewerUserId?: string; viewerRole?: 'STUDENT' | 'ADMIN' } = {},
  ) {
    if (!mongoose.isValidObjectId(courseId)) throw new NotFoundError('Course not found.');

    // Admin sees draft/hidden; everyone else only sees published.
    const findQuery: FilterQuery<ICourse> = { _id: courseId, isDeleted: false };
    if (opts.viewerRole !== 'ADMIN') findQuery.isPublished = true;

    const course = await this.courseModel.findOne(findQuery)
      .populate('instructorId', 'firstName lastName avatarUrl')
      .lean();
    if (!course) throw new NotFoundError('Course not found.');

    const lessons = await this.lessonModel.find({ courseId, isDeleted: false })
      .sort({ order: 1 })
      .select('title order durationMinutes isLocked isFreePreview videoUrl')
      .lean();

    let isEnrolled = false;
    let progress   = 0;
    if (opts.viewerUserId) {
      const e = await this.enrollmentModel
        .findOne({ userId: opts.viewerUserId, courseId })
        .lean<{ progress?: number } | null>();
      if (e) { isEnrolled = true; progress = e.progress ?? 0; }
    }

    return { course, lessons, isEnrolled, progress };
  }

  // ─── UC15 / UC16 — Admin CRUD ────────────────────────────────────────────────

  async createCourse(dto: CreateCourseDto, instructorId?: string) {
    return this.courseModel.create({
      ...dto,
      tags: dto.tags ?? [],
      instructorId,
    });
  }

  async updateCourse(courseId: string, dto: UpdateCourseDto) {
    if (!mongoose.isValidObjectId(courseId)) throw new NotFoundError('Course not found.');
    const course = await this.courseModel.findOneAndUpdate(
      { _id: courseId, isDeleted: false }, dto, { new: true },
    );
    if (!course) throw new NotFoundError('Course not found.');
    return course;
  }

  // ─── UC17 — Hide / Show ──────────────────────────────────────────────────────

  async togglePublish(courseId: string, isPublished: boolean) {
    if (!mongoose.isValidObjectId(courseId)) throw new NotFoundError('Course not found.');

    // BR UC15 / UC17 — chỉ publish khi có ≥ 1 lesson hợp lệ.
    if (isPublished) {
      const lessonCount = await this.lessonModel.countDocuments({
        courseId, isDeleted: false,
      });
      if (lessonCount === 0) {
        throw new BadRequestException('Cannot publish a course with no active lessons.');
      }
    }

    const course = await this.courseModel.findOneAndUpdate(
      { _id: courseId, isDeleted: false }, { isPublished }, { new: true },
    );
    if (!course) throw new NotFoundError('Course not found.');
    return course;
  }

  // ─── UC18 — Soft delete ──────────────────────────────────────────────────────

  async deleteCourse(courseId: string) {
    if (!mongoose.isValidObjectId(courseId)) throw new NotFoundError('Course not found.');

    const course = await this.courseModel.findOneAndUpdate(
      { _id: courseId, isDeleted: false },
      { isDeleted: true, isPublished: false },
      { new: true },
    );
    if (!course) throw new NotFoundError('Course not found.');

    // Cascade soft-delete lessons so they vanish from listings, but enrollment
    // history is preserved for analytics.
    await this.lessonModel.updateMany({ courseId }, { isDeleted: true });

    // Cascade hard-delete bookmarks pointing at this course / its lessons so
    // they don't appear as broken entries in BookmarkListPage.
    const lessons = await this.lessonModel.find({ courseId })
      .select('_id').lean<{ _id: { toString(): string } }[]>();
    const lessonIds = lessons.map((l) => l._id.toString());
    await this.bookmarkModel.deleteMany({
      $or: [
        { targetType: 'COURSE', targetId: courseId.toString() },
        { targetType: 'LESSON', targetId: { $in: lessonIds } },
      ],
    });
    return { deleted: true };
  }

  /** Internal — bump denormalized counters when lessons/enrollments change. */
  async recomputeCounters(courseId: string) {
    if (!mongoose.isValidObjectId(courseId)) return;
    const [totalLessons, totalEnrollments] = await Promise.all([
      this.lessonModel.countDocuments({ courseId, isDeleted: false }),
      this.enrollmentModel.countDocuments({ courseId }),
    ]);
    await this.courseModel.updateOne({ _id: courseId }, { totalLessons, totalEnrollments });
  }
}
