import { Enrollment } from '../models/enrollment.model';
import { LessonProgress } from '../models/lesson-progress.model';
import { Course } from '../../courses/models/course.model';
import { Lesson } from '../../lessons/models/lesson.model';
import { User } from '../../auth/models/user.model';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../common/custom-error';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { EnrollmentCompletionPublisher } from '../application/events/enrollment-completion.publisher';

export class EnrollmentsService {
  static async enrollInCourse(userId: string, courseId: string) {
    const course = await Course.findById(courseId);
    if (!course || ['deleted', 'hidden', 'archived'].includes(course.status)) {
      throw new NotFoundError('Course not found.');
    }
    if (course.status !== 'published') {
      throw new ForbiddenError('COURSE_ACCESS_DENIED');
    }
    if (course.isPremium) {
      const user = await User.findById(userId).select('planType subscriptionExpiresAt');
      const isPremium =
        user?.planType === 'PREMIUM' &&
        (!user.subscriptionExpiresAt || user.subscriptionExpiresAt.getTime() > Date.now());
      if (!isPremium) throw new ForbiddenError('COURSE_PREMIUM_REQUIRED');
    }

    const existing = await Enrollment.findOne({ userId, courseId });
    if (existing) {
      throw new BadRequestError('User is already enrolled in this course.');
    }

    const missingPrerequisites: string[] = [];
    for (const prerequisiteId of course.prerequisites ?? []) {
      const prerequisiteEnrollment = await Enrollment.findOne({
        userId,
        courseId: prerequisiteId,
      });
      if (!prerequisiteEnrollment || prerequisiteEnrollment.progress < course.prerequisiteThreshold) {
        missingPrerequisites.push(prerequisiteId.toString());
      }
    }
    if (missingPrerequisites.length) {
      throw new ForbiddenError(`COURSE_PREREQUISITE_REQUIRED:${missingPrerequisites.join(',')}`);
    }

    const totalLessons = await Lesson.countDocuments({
      courseId,
      status: { $nin: ['deleted', 'hidden'] },
    });

    const enrollment = await Enrollment.create({
      userId,
      courseId,
      progress: 0,
      progressPercent: 0,
      completedLessons: [],
      totalLessons,
      completed: false,
      lastAccessedAt: new Date(),
    });

    await Course.findByIdAndUpdate(courseId, { $inc: { totalEnrollments: 1 } });

    await NotificationsService.sendNotification({
      userId,
      title: 'Enrolled in course',
      message: `Bạn đã tham gia khoá học "${course.title}".`,
      type: 'COURSE_ENROLLED',
      metadata: { courseId },
      link: `/courses/${courseId}`,
    });

    return enrollment;
  }

  static async listMyEnrollments(userId: string) {
    const enrollments = await Enrollment.find({ userId })
      .populate('courseId', 'title slug thumbnailUrl level language status isPremium totalLessons')
      .sort({ updatedAt: -1 });
    return enrollments.filter((enrollment) => enrollment.courseId);
  }

  static async getMyResume(userId: string) {
    const enrollment = await Enrollment.findOne({ userId, completed: false })
      .sort({ lastAccessedAt: -1, updatedAt: -1 })
      .populate('courseId', 'title slug thumbnailUrl level language status isPremium totalLessons')
      .lean();
    return enrollment;
  }

  static async getMyCourseEnrollment(userId: string, courseId: string) {
    return Enrollment.findOne({ userId, courseId });
  }

  static async markLessonComplete(userId: string, lessonId: string) {
    const lesson = await Lesson.findById(lessonId);
    if (!lesson || lesson.status === 'deleted') throw new NotFoundError('Lesson not found.');
    if (lesson.status === 'locked' || lesson.isLocked) throw new ForbiddenError('Lesson is locked.');

    const enrollment = await Enrollment.findOne({ userId, courseId: lesson.courseId });
    if (!enrollment) throw new ForbiddenError('You must enroll before completing this lesson.');

    const alreadyCompleted = enrollment.completedLessons.some((id) => id.toString() === lesson.id);
    if (!alreadyCompleted) {
      enrollment.completedLessons.push(lesson._id);
    }

    await LessonProgress.findOneAndUpdate(
      { userId, lessonId: lesson._id },
      {
        $set: {
          courseId: lesson.courseId,
          isCompleted: true,
          completedAt: new Date(),
          lastAccessedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    enrollment.lastLessonId = lesson._id;
    enrollment.lastAccessedAt = new Date();

    const totalLessons = await Lesson.countDocuments({
      courseId: lesson.courseId,
      status: { $nin: ['deleted', 'hidden'] },
    });
    const completedLessons = enrollment.completedLessons.length;
    enrollment.progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    enrollment.progressPercent = enrollment.progress;
    enrollment.totalLessons = totalLessons;

    const courseJustCompleted = enrollment.progress >= 100 && !enrollment.completed;
    if (courseJustCompleted) {
      enrollment.completed = true;
      enrollment.completedAt = new Date();
    }

    await enrollment.save();

    const effects = await EnrollmentCompletionPublisher.publishLessonCompleted({
      userId,
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      courseId: lesson.courseId.toString(),
      progressPercent: enrollment.progress,
      totalLessons,
      completedLessons,
      alreadyCompleted,
      courseCompleted: courseJustCompleted,
    });

    return {
      enrollment,
      totalLessons,
      completedLessons,
      progressPercent: enrollment.progress,
      courseCompleted: enrollment.completed,
      xpRewarded: effects.xpRewarded,
      stats: effects.stats,
    };
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
    let stats = null;
    if (enrollment.completed && !wasCompleted) {
      const effects = await EnrollmentCompletionPublisher.publishCourseCompleted({
        userId,
        courseId,
        progressPercent: enrollment.progress,
        totalLessons,
        completedLessons: completedLessonsCount,
      });
      xpRewarded = effects.xpRewarded;
      stats = effects.stats;
    }

    return {
      enrollment,
      xpRewarded,
      stats,
    };
  }
}
export default EnrollmentsService;
