import { Enrollment } from '../models/enrollment.model';
import { Course } from '../../courses/models/course.model';
import { Lesson } from '../../lessons/models/lesson.model';
import { UserStats } from '../../gamification/models/user-stats.model';
import { BadRequestError, NotFoundError } from '../../../common/custom-error';

export class EnrollmentsService {
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
        stats.xp += xpRewarded;
        stats.coursesCompleted += 1;
        stats.level = Math.floor(stats.xp / 1000) + 1;
        await stats.save();
      }
    }

    return {
      enrollment,
      xpRewarded,
    };
  }
}
export default EnrollmentsService;
