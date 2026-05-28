import mongoose from 'mongoose';
import { Enrollment } from '../models/enrollment.model';
import { Course } from '../../courses/models/course.model';
import { Lesson } from '../../lessons/models/lesson.model';
import { UserStats } from '../../gamification/models/user-stats.model';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../common/custom-error';
import { logger } from '../../../configs/logger';

export class EnrollmentsService {
  /**
   * Mark a specific lesson as complete, fire LESSON_COMPLETED notification,
   * then recalculate overall course progress.
   *
   * This is the single trigger point for the LESSON_COMPLETED notification type
   * (previously pending from DEV 4).
   */
  static async markLessonComplete(
    userId: string,
    lessonId: string,
    completedLessonsCount: number
  ) {
    if (!mongoose.isValidObjectId(lessonId)) {
      throw new NotFoundError('Lesson not found.');
    }

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) throw new NotFoundError('Lesson not found.');

    const enrollment = await Enrollment.findOne({ userId, courseId: lesson.courseId });
    if (!enrollment) {
      throw new ForbiddenError('You must be enrolled in this course to mark lessons as complete.');
    }

    // Fire LESSON_COMPLETED — fire-and-forget so failures never block the response
    NotificationsService.notify(
      userId,
      'LESSON_COMPLETED',
      'Bài học hoàn thành!',
      `Bạn đã hoàn thành bài "${lesson.title}"`,
      { lessonId: lesson._id, courseId: lesson.courseId }
    ).catch((err) => logger.warn('Lesson completed notification failed (non-critical).', err));

    // Recalculate course progress and handle COURSE_COMPLETED + LEVEL_UP if needed
    return EnrollmentsService.updateLessonProgress(
      userId,
      lesson.courseId.toString(),
      completedLessonsCount
    );
  }

  static async enrollInCourse(userId: string, courseId: string) {
    const course = await Course.findById(courseId);
    if (!course) {
      throw new NotFoundError('Course not found.');
    }

    const existing = await Enrollment.findOne({ userId, courseId });
    if (existing) {
      throw new BadRequestError('User is already enrolled in this course.');
    }

    const enrollment = await Enrollment.create({
      userId,
      courseId,
      progress: 0,
      completed: false,
    });

    try {
      await NotificationsService.notify(
        userId,
        'COURSE_ENROLLED',
        'Đăng ký khóa học thành công! 🎓',
        `Bạn đã tham gia khóa học "${course.title}". Chúc bạn học tốt!`,
        { courseId: course._id, courseTitle: course.title }
      );
    } catch (err) {
      logger.warn('Enrollment notification failed (non-critical).', err);
    }

    return enrollment;
  }

  static async updateLessonProgress(userId: string, courseId: string, completedLessonsCount: number) {
    const enrollment = await Enrollment.findOne({ userId, courseId });
    if (!enrollment) {
      throw new NotFoundError('Active enrollment not found for this course.');
    }

    const totalLessons = await Lesson.countDocuments({ courseId });
    if (totalLessons === 0) {
      throw new BadRequestError('This course contains no lessons yet.');
    }

    const progressPercentage = Math.min(100, Math.max(0, (completedLessonsCount / totalLessons) * 100));

    const wasCompleted = enrollment.completed;
    enrollment.progress = progressPercentage;

    if (progressPercentage === 100) {
      enrollment.completed = true;
    }

    await enrollment.save();

    let xpRewarded = 0;
    if (enrollment.completed && !wasCompleted) {
      xpRewarded = 500;
      const stats = await UserStats.findOne({ userId });
      if (stats) {
        const oldLevel = stats.level;

        stats.xp += xpRewarded;
        stats.coursesCompleted += 1;
        stats.level = Math.floor(stats.xp / 1000) + 1;
        await stats.save();

        const course = await Course.findById(courseId).select('title').lean();

        try {
          await NotificationsService.notify(
            userId,
            'COURSE_COMPLETED',
            'Hoàn thành khóa học! 🏆',
            `Xuất sắc! Bạn đã hoàn thành "${course?.title ?? 'khóa học'}" và nhận 500 XP!`,
            { courseId, xpRewarded: 500 }
          );

          if (stats.level > oldLevel) {
            await NotificationsService.notify(
              userId,
              'LEVEL_UP',
              `Lên Level ${stats.level}! 🚀`,
              `Chúc mừng! Bạn đã đạt Level ${stats.level}.`,
              { newLevel: stats.level, xp: stats.xp }
            );
          }
        } catch (err) {
          logger.warn('Course completion notification failed (non-critical).', err);
        }
      }
    }

    return {
      enrollment,
      xpRewarded,
    };
  }
}

export default EnrollmentsService;
