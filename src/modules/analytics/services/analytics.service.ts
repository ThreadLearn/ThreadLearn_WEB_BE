import { User } from '../../auth/models/user.model';
import { Course } from '../../courses/models/course.model';
import { Enrollment } from '../../enrollments/models/enrollment.model';
import { QuizAttempt } from '../../quiz-attempts/models/quiz-attempt.model';

export class AnalyticsService {
  /**
   * Returns aggregated platform-wide stats for the admin dashboard.
   */
  static async getPlatformStats() {
    const [totalUsers, totalCourses, totalEnrollments, totalAttempts] = await Promise.all([
      User.countDocuments(),
      Course.countDocuments(),
      Enrollment.countDocuments(),
      QuizAttempt.countDocuments(),
    ]);

    const completedEnrollments = await Enrollment.countDocuments({ completed: true });
    const passedAttempts = await QuizAttempt.countDocuments({ passed: true });

    return {
      totalUsers,
      totalCourses,
      totalEnrollments,
      completedEnrollments,
      courseCompletionRate: totalEnrollments > 0
        ? Math.round((completedEnrollments / totalEnrollments) * 100)
        : 0,
      totalQuizAttempts: totalAttempts,
      passedQuizAttempts: passedAttempts,
      quizPassRate: totalAttempts > 0
        ? Math.round((passedAttempts / totalAttempts) * 100)
        : 0,
    };
  }

  /**
   * Returns per-user progress summary.
   */
  static async getUserProgress(userId: string) {
    const enrollments = await Enrollment.find({ userId }).populate('courseId', 'title');
    const attempts = await QuizAttempt.find({ userId }).sort({ createdAt: -1 }).limit(20);

    return {
      enrollments,
      recentAttempts: attempts,
    };
  }
}
export default AnalyticsService;
