import { User } from '../../auth/models/user.model';
import { AIHistory } from '../../ai/models/ai-history.model';
import { Course } from '../../courses/models/course.model';
import { Enrollment } from '../../enrollments/models/enrollment.model';
import { Lesson } from '../../lessons/models/lesson.model';
import { Notification } from '../../notifications/models/notification.model';
import { QuizAttempt } from '../../quiz-attempts/models/quiz-attempt.model';

type DashboardStatisticsQuery = {
  from?: string;
  to?: string;
  months: number;
};

type MonthlyCount = {
  month: string;
  count: number;
};

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

  static async getAdminDashboardStatistics(query: DashboardStatisticsQuery) {
    const range = this.resolveDateRange(query);
    const newUsersThisMonthStart = new Date();
    newUsersThisMonthStart.setDate(1);
    newUsersThisMonthStart.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalStudents,
      totalAdmins,
      activeStudents,
      lockedStudents,
      verifiedUsers,
      unverifiedUsers,
      newUsersThisMonth,
      totalCourses,
      totalLessons,
      totalEnrollments,
      totalQuizAttempts,
      totalAiRequests,
      totalNotifications,
      quizStats,
      activeUsersThisMonth,
      newUsersByMonth,
      enrollmentsByMonth,
      quizAttemptsByMonth,
      coursesCreatedByMonth,
      lessonsCreatedByMonth,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'STUDENT' }),
      User.countDocuments({ role: 'ADMIN' }),
      User.countDocuments({ role: 'STUDENT', isActive: true, lockedAt: { $exists: false } }),
      User.countDocuments({ role: 'STUDENT', $or: [{ isActive: false }, { lockedAt: { $exists: true, $ne: null } }] }),
      User.countDocuments({ isVerified: true }),
      User.countDocuments({ isVerified: { $ne: true } }),
      User.countDocuments({ createdAt: { $gte: newUsersThisMonthStart } }),
      Course.countDocuments(),
      Lesson.countDocuments(),
      Enrollment.countDocuments(),
      QuizAttempt.countDocuments(),
      AIHistory.countDocuments(),
      Notification.countDocuments(),
      this.getQuizStats(),
      User.countDocuments({ lastLoginAt: { $gte: newUsersThisMonthStart } }),
      this.aggregateMonthlyCounts(User, 'createdAt', range.start, range.end),
      this.aggregateMonthlyCounts(Enrollment, 'enrolledAt', range.start, range.end),
      this.aggregateMonthlyCounts(QuizAttempt, 'createdAt', range.start, range.end),
      this.aggregateMonthlyCounts(Course, 'createdAt', range.start, range.end),
      this.aggregateMonthlyCounts(Lesson, 'createdAt', range.start, range.end),
    ]);

    return {
      summary: {
        totalUsers,
        totalStudents,
        totalAdmins,
        activeStudents,
        lockedStudents,
        verifiedUsers,
        unverifiedUsers,
        newUsersThisMonth,
        totalCourses,
        totalLessons,
        totalEnrollments,
        totalQuizAttempts,
        totalAiRequests,
        totalNotifications,
        averageQuizScore: quizStats.averageQuizScore,
        quizPassRate: quizStats.quizPassRate,
        activeUsersThisMonth,
      },
      charts: {
        newUsersByMonth: this.fillMonthlyGaps(newUsersByMonth, range.start, range.end),
        enrollmentsByMonth: this.fillMonthlyGaps(enrollmentsByMonth, range.start, range.end),
        quizAttemptsByMonth: this.fillMonthlyGaps(quizAttemptsByMonth, range.start, range.end),
        coursesCreatedByMonth: this.fillMonthlyGaps(coursesCreatedByMonth, range.start, range.end),
        lessonsCreatedByMonth: this.fillMonthlyGaps(lessonsCreatedByMonth, range.start, range.end),
      },
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

  private static resolveDateRange(query: DashboardStatisticsQuery) {
    const end = query.to ? new Date(query.to) : new Date();
    end.setHours(23, 59, 59, 999);

    const start = query.from ? new Date(query.from) : new Date(end);
    if (!query.from) {
      start.setMonth(start.getMonth() - query.months + 1);
    }
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    return { start, end };
  }

  private static async aggregateMonthlyCounts(model: any, dateField: string, start: Date, end: Date): Promise<MonthlyCount[]> {
    const rows = await model.aggregate([
      { $match: { [dateField]: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: {
            year: { $year: `$${dateField}` },
            month: { $month: `$${dateField}` },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      {
        $project: {
          _id: 0,
          month: {
            $concat: [
              { $toString: '$_id.year' },
              '-',
              {
                $cond: [
                  { $lt: ['$_id.month', 10] },
                  { $concat: ['0', { $toString: '$_id.month' }] },
                  { $toString: '$_id.month' },
                ],
              },
            ],
          },
          count: 1,
        },
      },
    ]);

    return rows;
  }

  private static async getQuizStats() {
    const [stats] = await QuizAttempt.aggregate([
      {
        $group: {
          _id: null,
          averageQuizScore: { $avg: '$score' },
          totalAttempts: { $sum: 1 },
          passedAttempts: {
            $sum: {
              $cond: ['$passed', 1, 0],
            },
          },
        },
      },
    ]);

    if (!stats) {
      return {
        averageQuizScore: 0,
        quizPassRate: 0,
      };
    }

    return {
      averageQuizScore: Math.round(stats.averageQuizScore || 0),
      quizPassRate: stats.totalAttempts > 0 ? Math.round((stats.passedAttempts / stats.totalAttempts) * 100) : 0,
    };
  }

  private static fillMonthlyGaps(rows: MonthlyCount[], start: Date, end: Date) {
    const countsByMonth = new Map(rows.map((row) => [row.month, row.count]));
    const result: MonthlyCount[] = [];
    const cursor = new Date(start);

    while (cursor <= end) {
      const month = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      result.push({
        month,
        count: countsByMonth.get(month) || 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return result;
  }
}
export default AnalyticsService;
