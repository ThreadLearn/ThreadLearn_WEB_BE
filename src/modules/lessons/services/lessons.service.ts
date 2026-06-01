import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import mongoose from 'mongoose';
import { ILesson } from '../models/lesson.model';
import { ICourse } from '../../courses/models/course.model';
import { IEnrollment } from '../../enrollments/models/enrollment.model';
import { ILessonProgress } from '../../enrollments/models/lesson-progress.model';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { CertificatesService } from '../../certificates/services/certificates.service';
import {
  BadRequestError, ForbiddenError, NotFoundError,
} from '../../../common/custom-error';
import { CreateLessonDto, UpdateLessonDto } from '../dto/lesson.dto';

interface LessonViewerCtx {
  userId?: string;
  role?:   'STUDENT' | 'ADMIN';
}

@Injectable()
export class LessonsService {
  private readonly logger = new Logger(LessonsService.name);

  constructor(
    @InjectModel('Lesson')         private lessonModel:     Model<ILesson>,
    @InjectModel('Course')         private courseModel:     Model<ICourse>,
    @InjectModel('Enrollment')     private enrollmentModel: Model<IEnrollment>,
    @InjectModel('LessonProgress') private progressModel:   Model<ILessonProgress>,
    @InjectModel('Bookmark')       private bookmarkModel:   Model<any>,
    private readonly notifications: NotificationsService,
    private readonly certificates:  CertificatesService,
  ) {}

  // ─── UC25 — View lesson (Guest can see only isFreePreview) ───────────────────

  async getLesson(lessonId: string, ctx: LessonViewerCtx = {}) {
    if (!mongoose.isValidObjectId(lessonId)) throw new NotFoundError('Lesson not found.');
    const lesson = await this.lessonModel.findOne({ _id: lessonId, isDeleted: false }).lean();
    if (!lesson) throw new NotFoundError('Lesson not found.');

    const course = await this.courseModel.findOne({ _id: lesson.courseId, isDeleted: false }).lean();
    if (!course || !course.isPublished) {
      // Admin can still view unpublished
      if (ctx.role !== 'ADMIN') throw new NotFoundError('Lesson not available.');
    }

    if (lesson.isLocked && ctx.role !== 'ADMIN') {
      throw new ForbiddenError('This lesson is currently locked.');
    }

    if (lesson.isFreePreview || ctx.role === 'ADMIN') return lesson;

    if (!ctx.userId) {
      throw new ForbiddenError('Please log in to view this lesson.');
    }
    const enrolled = await this.enrollmentModel.exists({
      userId: ctx.userId, courseId: lesson.courseId,
    });
    if (!enrolled) {
      throw new ForbiddenError('You must enroll in this course to view this lesson.');
    }
    return lesson;
  }

  async getLessonsByCourse(courseId: string, ctx: LessonViewerCtx = {}) {
    if (!mongoose.isValidObjectId(courseId)) throw new BadRequestError('Invalid courseId.');
    const query: any = { courseId, isDeleted: false };
    if (ctx.role !== 'ADMIN') query.isLocked = false;
    return this.lessonModel.find(query).sort({ order: 1 }).lean();
  }

  // ─── UC19 / UC20 — Admin create / edit ───────────────────────────────────────

  async createLesson(dto: CreateLessonDto) {
    const course = await this.courseModel.findOne({ _id: dto.courseId, isDeleted: false });
    if (!course) throw new NotFoundError('Course not found.');

    // Auto-order: append to the end if no order specified.
    const order = dto.order ?? await this.lessonModel.countDocuments({
      courseId: dto.courseId, isDeleted: false,
    });

    const lesson = await this.lessonModel.create({ ...dto, order });
    await this.courseModel.updateOne(
      { _id: dto.courseId },
      { $inc: { totalLessons: 1 } },
    );

    // BOOKMARK_COURSE_UPDATED — anyone who bookmarked this course gets notified.
    // (Handled by DEV3 BookmarkService consumer; we just emit the trigger here.)
    this.broadcastCourseUpdated(dto.courseId, lesson.title).catch((err) =>
      this.logger.warn('BOOKMARK_COURSE_UPDATED notify failed (non-critical).', err),
    );

    return lesson;
  }

  async updateLesson(lessonId: string, dto: UpdateLessonDto) {
    if (!mongoose.isValidObjectId(lessonId)) throw new NotFoundError('Lesson not found.');
    const lesson = await this.lessonModel.findOneAndUpdate(
      { _id: lessonId, isDeleted: false }, dto, { new: true },
    );
    if (!lesson) throw new NotFoundError('Lesson not found.');
    return lesson;
  }

  // ─── UC21 — Lock/Unlock ──────────────────────────────────────────────────────

  async toggleLock(lessonId: string, isLocked: boolean) {
    if (!mongoose.isValidObjectId(lessonId)) throw new NotFoundError('Lesson not found.');
    const lesson = await this.lessonModel.findOneAndUpdate(
      { _id: lessonId, isDeleted: false }, { isLocked }, { new: true },
    );
    if (!lesson) throw new NotFoundError('Lesson not found.');
    return lesson;
  }

  // ─── UC22 — Soft delete ──────────────────────────────────────────────────────

  async deleteLesson(lessonId: string) {
    if (!mongoose.isValidObjectId(lessonId)) throw new NotFoundError('Lesson not found.');
    const lesson = await this.lessonModel.findOneAndUpdate(
      { _id: lessonId, isDeleted: false }, { isDeleted: true }, { new: true },
    );
    if (!lesson) throw new NotFoundError('Lesson not found.');

    await this.courseModel.updateOne(
      { _id: lesson.courseId, totalLessons: { $gt: 0 } },
      { $inc: { totalLessons: -1 } },
    );
    return { deleted: true };
  }

  // ─── UC27 — Student marks lesson complete ───────────────────────────────────

  async completeLesson(userId: string, lessonId: string) {
    if (!mongoose.isValidObjectId(lessonId)) throw new NotFoundError('Lesson not found.');
    const lesson = await this.lessonModel.findOne({ _id: lessonId, isDeleted: false });
    if (!lesson) throw new NotFoundError('Lesson not found.');
    if (lesson.isLocked) throw new ForbiddenError('Lesson is locked.');

    const enrollment = await this.enrollmentModel.findOne({
      userId, courseId: lesson.courseId,
    });
    if (!enrollment) {
      throw new ForbiddenError('You must enroll in this course to complete its lessons.');
    }

    // Idempotent upsert — re-marking a lesson is a no-op without flooding notifications.
    let isNewCompletion = false;
    try {
      const result = await this.progressModel.updateOne(
        { userId, lessonId },
        { $setOnInsert: {
            userId, lessonId, courseId: lesson.courseId,
            completedAt: new Date(),
          } },
        { upsert: true },
      );
      isNewCompletion = (result.upsertedCount ?? 0) > 0;
    } catch (err: any) {
      // Race: another request inserted the same row first — treat as already-completed.
      if (err?.code !== 11000) throw err;
    }

    // Recompute aggregate progress — chỉ đếm progress trỏ tới lesson còn ACTIVE.
    // Khi Admin soft-delete một lesson user đã học, progress phải re-balance theo
    // tổng lesson còn lại để không bị skew vượt 100%.
    const activeLessons = await this.lessonModel.find({
      courseId: lesson.courseId, isDeleted: false,
    }).select('_id').lean<{ _id: any }[]>();
    const activeLessonIds  = activeLessons.map((l) => l._id);
    const totalLessons     = activeLessons.length;
    const completedLessons = await this.progressModel.countDocuments({
      userId, courseId: lesson.courseId,
      lessonId: { $in: activeLessonIds },
    });
    const progress = totalLessons === 0 ? 0
      : Math.min(100, Math.round((completedLessons / totalLessons) * 100));

    const wasCompleted = enrollment.completed;
    enrollment.progress  = progress;
    enrollment.completed = progress === 100;
    await enrollment.save();

    if (isNewCompletion) {
      this.notifications.notify(
        userId, 'LESSON_COMPLETED',
        'Bài học hoàn thành!',
        `Bạn đã hoàn thành bài "${lesson.title}"`,
        { lessonId: lesson._id, courseId: lesson.courseId },
      ).catch((err) =>
        this.logger.warn('LESSON_COMPLETED notify failed (non-critical).', err),
      );
    }

    if (enrollment.completed && !wasCompleted) {
      const course = await this.courseModel.findById(lesson.courseId)
        .select('title').lean<{ title?: string }>();
      this.notifications.notify(
        userId, 'COURSE_COMPLETED',
        'Hoàn thành khóa học! 🏆',
        `Xuất sắc! Bạn đã hoàn thành "${course?.title ?? 'khóa học'}".`,
        { courseId: lesson.courseId },
      ).catch((err) =>
        this.logger.warn('COURSE_COMPLETED notify failed (non-critical).', err),
      );

      // UC58 — Auto-issue certificate for completed IT-learning course.
      this.certificates.issueIfEligible(userId, lesson.courseId.toString())
        .then((cert) => this.logger.log(`Certificate ${cert.certificateCode} issued.`))
        .catch((err) => this.logger.warn('Certificate issue failed (non-critical).', err));
    }

    return {
      completed: true,
      progress,
      totalLessons,
      completedLessons,
      courseCompleted: enrollment.completed,
    };
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async broadcastCourseUpdated(courseId: string, lessonTitle: string) {
    // Best-effort: anyone who bookmarked this course gets a heads-up notification.
    try {
      const watchers = await this.bookmarkModel
        .find({ targetType: 'COURSE', targetId: courseId })
        .select('userId')
        .lean<{ userId: { toString(): string } }[]>();
      if (watchers.length === 0) return;

      const course = await this.courseModel.findById(courseId)
        .select('title').lean<{ title?: string }>();

      await Promise.all(watchers.map((b) =>
        this.notifications.notify(
          b.userId.toString(),
          'BOOKMARK_COURSE_UPDATED',
          'Khóa học có bài mới!',
          `"${course?.title ?? 'Khóa học'}" vừa thêm bài "${lessonTitle}"`,
          { courseId, lessonTitle },
        ),
      ));
    } catch (err) {
      this.logger.warn('broadcastCourseUpdated failed (non-critical).', err);
    }
  }
}
