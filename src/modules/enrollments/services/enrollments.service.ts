import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import mongoose from 'mongoose';
import { IEnrollment } from '../models/enrollment.model';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../common/custom-error';

@Injectable()
export class EnrollmentsService {
  private readonly logger = new Logger(EnrollmentsService.name);

  constructor(
    @InjectModel('Enrollment') private enrollmentModel: Model<IEnrollment>,
    @InjectModel('Course')     private courseModel:     Model<any>,
    @InjectModel('Lesson')     private lessonModel:     Model<any>,
    @InjectModel('UserStats')  private userStatsModel:  Model<any>,
    private readonly notifications: NotificationsService,
  ) {}

  /** Mark a lesson complete, notify LESSON_COMPLETED, recalculate course progress. */
  async markLessonComplete(userId: string, lessonId: string, completedLessonsCount: number) {
    if (!mongoose.isValidObjectId(lessonId)) throw new NotFoundError('Lesson not found.');

    const lesson = await this.lessonModel.findById(lessonId);
    if (!lesson) throw new NotFoundError('Lesson not found.');

    const enrollment = await this.enrollmentModel.findOne({ userId, courseId: lesson.courseId });
    if (!enrollment) {
      throw new ForbiddenError('You must be enrolled in this course to mark lessons as complete.');
    }

    this.notifications.notify(
      userId, 'LESSON_COMPLETED',
      'Bài học hoàn thành!',
      `Bạn đã hoàn thành bài "${lesson.title}"`,
      { lessonId: lesson._id, courseId: lesson.courseId },
    ).catch((err) => this.logger.warn('LESSON_COMPLETED notify failed (non-critical).', err));

    return this.updateLessonProgress(userId, lesson.courseId.toString(), completedLessonsCount);
  }

  async enrollInCourse(userId: string, courseId: string) {
    const course = await this.courseModel.findById(courseId);
    if (!course) throw new NotFoundError('Course not found.');

    const existing = await this.enrollmentModel.findOne({ userId, courseId });
    if (existing) throw new BadRequestError('User is already enrolled in this course.');

    const enrollment = await this.enrollmentModel.create({
      userId, courseId, progress: 0, completed: false,
    });

    this.notifications.notify(
      userId, 'COURSE_ENROLLED',
      'Đăng ký khóa học thành công! 🎓',
      `Bạn đã tham gia khóa học "${course.title}". Chúc bạn học tốt!`,
      { courseId: course._id, courseTitle: course.title },
    ).catch((err) => this.logger.warn('COURSE_ENROLLED notify failed (non-critical).', err));

    return enrollment;
  }

  async updateLessonProgress(userId: string, courseId: string, completedLessonsCount: number) {
    const enrollment = await this.enrollmentModel.findOne({ userId, courseId });
    if (!enrollment) throw new NotFoundError('Active enrollment not found for this course.');

    const totalLessons = await this.lessonModel.countDocuments({ courseId });
    if (totalLessons === 0) throw new BadRequestError('This course contains no lessons yet.');

    const progressPercentage = Math.min(100, Math.max(0, (completedLessonsCount / totalLessons) * 100));
    const wasCompleted = enrollment.completed;
    enrollment.progress = progressPercentage;
    if (progressPercentage === 100) enrollment.completed = true;
    await enrollment.save();

    let xpRewarded = 0;
    if (enrollment.completed && !wasCompleted) {
      xpRewarded = 500;
      const stats = await this.userStatsModel.findOne({ userId });
      if (stats) {
        const oldLevel = stats.level;
        stats.xp += xpRewarded;
        stats.coursesCompleted += 1;
        stats.level = Math.floor(stats.xp / 1000) + 1;
        await stats.save();

        const course = await this.courseModel.findById(courseId).select('title').lean<{ title?: string }>();

        this.notifications.notify(
          userId, 'COURSE_COMPLETED',
          'Hoàn thành khóa học! 🏆',
          `Xuất sắc! Bạn đã hoàn thành "${course?.title ?? 'khóa học'}" và nhận 500 XP!`,
          { courseId, xpRewarded: 500 },
        ).catch((err) => this.logger.warn('COURSE_COMPLETED notify failed (non-critical).', err));

        if (stats.level > oldLevel) {
          this.notifications.notify(
            userId, 'LEVEL_UP',
            `Lên Level ${stats.level}! 🚀`,
            `Chúc mừng! Bạn đã đạt Level ${stats.level}.`,
            { newLevel: stats.level, xp: stats.xp },
          ).catch((err) => this.logger.warn('LEVEL_UP notify failed (non-critical).', err));
        }
      }
    }

    return { enrollment, xpRewarded };
  }
}
