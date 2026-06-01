import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import mongoose from 'mongoose';
import { IEnrollment } from '../models/enrollment.model';
import { ILessonProgress } from '../models/lesson-progress.model';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../common/custom-error';

@Injectable()
export class EnrollmentsService {
  private readonly logger = new Logger(EnrollmentsService.name);

  constructor(
    @InjectModel('Enrollment')     private enrollmentModel: Model<IEnrollment>,
    @InjectModel('Course')         private courseModel:     Model<any>,
    @InjectModel('Lesson')         private lessonModel:     Model<any>,
    @InjectModel('LessonProgress') private progressModel:   Model<ILessonProgress>,
    @InjectModel('UserStats')      private userStatsModel:  Model<any>,
    @InjectModel('User')           private userModel:       Model<any>,
    private readonly notifications: NotificationsService,
  ) {}

  // ─── UC26 — Enroll in course ────────────────────────────────────────────────

  async enrollInCourse(userId: string, courseId: string) {
    if (!mongoose.isValidObjectId(courseId)) throw new NotFoundError('Course not found.');
    const course = await this.courseModel.findOne({
      _id: courseId, isDeleted: false, isPublished: true,
    });
    if (!course) throw new NotFoundError('Course not found or not available.');

    // BR UC26 — Premium gating: course Premium → user phải có isPremium.
    if (course.isPremium) {
      const user = await this.userModel.findById(userId)
        .select('isPremium').lean<{ isPremium?: boolean } | null>();
      if (!user?.isPremium) {
        throw new ForbiddenError('This is a Premium course. Upgrade to Premium to enroll.');
      }
    }

    const existing = await this.enrollmentModel.findOne({ userId, courseId });
    if (existing) {
      throw new BadRequestError('You are already enrolled in this course.');
    }

    // Race-safe enroll: nếu 2 request đồng thời, request thứ 2 sẽ E11000
    // (unique compound userId+courseId) — bắt và trả thông báo nhất quán.
    let enrollment;
    try {
      enrollment = await this.enrollmentModel.create({
        userId, courseId, progress: 0, completed: false,
      });
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new BadRequestError('You are already enrolled in this course.');
      }
      throw err;
    }

    // Bump denormalized counter on the course.
    await this.courseModel.updateOne(
      { _id: courseId }, { $inc: { totalEnrollments: 1 } },
    );

    this.notifications.notify(
      userId, 'COURSE_ENROLLED',
      'Đăng ký khóa học thành công! 🎓',
      `Bạn đã tham gia khóa học "${course.title}". Chúc bạn học tốt!`,
      { courseId: course._id, courseTitle: course.title },
    ).catch((err) =>
      this.logger.warn('COURSE_ENROLLED notify failed (non-critical).', err),
    );

    return enrollment;
  }

  // ─── UC28 — Track learning progress ─────────────────────────────────────────

  async getMyEnrollments(userId: string) {
    const enrollments = await this.enrollmentModel.find({ userId })
      .populate({
        path:   'courseId',
        select: 'title thumbnailUrl level totalLessons durationMinutes isDeleted isPublished',
        match:  { isDeleted: false },
      })
      .sort({ updatedAt: -1 })
      .lean();
    // Drop rows where the populated course was filtered out (deleted).
    return enrollments.filter((e: any) => e.courseId != null);
  }

  async getCourseProgress(userId: string, courseId: string) {
    if (!mongoose.isValidObjectId(courseId)) throw new BadRequestError('Invalid courseId.');

    const enrollment = await this.enrollmentModel.findOne({ userId, courseId }).lean();
    if (!enrollment) {
      throw new NotFoundError('You are not enrolled in this course.');
    }

    // Only count progress against still-active lessons (L7 fix).
    const activeLessons = await this.lessonModel.find({ courseId, isDeleted: false })
      .select('_id').lean<{ _id: any }[]>();
    const activeIds     = new Set(activeLessons.map((l) => l._id.toString()));
    const totalLessons  = activeLessons.length;
    const progressRows  = await this.progressModel
      .find({ userId, courseId }).select('lessonId').lean<{ lessonId: any }[]>();
    const completedLessonIds = progressRows
      .map((r) => r.lessonId.toString())
      .filter((id) => activeIds.has(id));

    return {
      enrollment,
      totalLessons,
      completedLessonIds,
      completedCount: completedLessonIds.length,
      progress:       enrollment.progress,
      completed:      enrollment.completed,
    };
  }

  async isEnrolled(userId: string, courseId: string): Promise<boolean> {
    if (!mongoose.isValidObjectId(courseId)) return false;
    const exists = await this.enrollmentModel.exists({ userId, courseId });
    return !!exists;
  }
}
