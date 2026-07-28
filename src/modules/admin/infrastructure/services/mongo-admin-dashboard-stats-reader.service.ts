import { Injectable } from '@nestjs/common';
import { AIHistory } from '../../../ai/models/ai-history.model';
import { User } from '../../../auth/models/user.model';
import { Course } from '../../../courses/models/course.model';
import { Enrollment } from '../../../enrollments/models/enrollment.model';
import { Lesson } from '../../../lessons/models/lesson.model';
import { Notification } from '../../../notifications/models/notification.model';
import { QuizAttempt } from '../../../quiz-attempts/models/quiz-attempt.model';
import { PurchaseModel } from '../../../subscription/infrastructure/persistence/schemas/purchase.schema';
import {
  AdminBasicStats,
  AdminDashboardStatisticsQuery,
  AdminDashboardStatisticsResult,
  AdminMonthlyCount,
  AdminStatusCount,
  IAdminDashboardStatsReader,
} from '../../domain/interfaces/admin-dashboard-stats-reader.port';

@Injectable()
export class MongoAdminDashboardStatsReaderService implements IAdminDashboardStatsReader {
  async getBasicStats(): Promise<AdminBasicStats> {
    const [totalUsers, totalCourses, totalEnrollments, totalAttempts] = await Promise.all([
      User.countDocuments(),
      Course.countDocuments(),
      Enrollment.countDocuments(),
      QuizAttempt.countDocuments(),
    ]);

    return {
      totalUsers,
      totalCourses,
      totalEnrollments,
      totalQuizAttempts: totalAttempts,
    };
  }

  async getDashboardStatistics(
    query: AdminDashboardStatisticsQuery,
  ): Promise<AdminDashboardStatisticsResult> {
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
      paymentSummary,
      successfulPayments,
      lockedUsers,
      activeVerifiedUsers,
      unreadNotifications,
      revenueByMonth,
      paymentStatusDistribution,
      notificationsByType,
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
      this.getPaymentSummary(),
      PurchaseModel.countDocuments({ status: 'succeeded' }),
      User.countDocuments({ isActive: false }),
      User.countDocuments({ isActive: true, isVerified: true }),
      Notification.countDocuments({ isRead: false }),
      this.aggregateMonthlyRevenue(range.start, range.end),
      this.aggregateStatusCounts(PurchaseModel),
      this.aggregateNotificationTypes(),
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
        totalRevenue: paymentSummary.totalRevenue,
        successfulPayments,
        lockedUsers,
        unreadNotifications,
      },
      charts: {
        newUsersByMonth: this.fillMonthlyGaps(newUsersByMonth, range.start, range.end),
        enrollmentsByMonth: this.fillMonthlyGaps(enrollmentsByMonth, range.start, range.end),
        quizAttemptsByMonth: this.fillMonthlyGaps(quizAttemptsByMonth, range.start, range.end),
        coursesCreatedByMonth: this.fillMonthlyGaps(coursesCreatedByMonth, range.start, range.end),
        lessonsCreatedByMonth: this.fillMonthlyGaps(lessonsCreatedByMonth, range.start, range.end),
        userGrowth: this.toChartCounts(newUsersByMonth, range.start, range.end),
        revenueTrend: this.fillMonthlyRevenueGaps(revenueByMonth, range.start, range.end),
        // Purchases are subscriptions and reference plans, not courses.
        topPurchasedCourses: [],
        paymentStatusDistribution,
        userStatusDistribution: [
          { status: 'Active', count: activeVerifiedUsers },
          { status: 'Locked', count: lockedUsers },
          { status: 'Unverified', count: unverifiedUsers },
        ],
        notificationsByType,
      },
    };
  }

  private resolveDateRange(query: AdminDashboardStatisticsQuery) {
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

  private async aggregateMonthlyCounts(
    model: { aggregate(pipeline: unknown[]): Promise<AdminMonthlyCount[]> },
    dateField: string,
    start: Date,
    end: Date,
  ): Promise<AdminMonthlyCount[]> {
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

  private async getQuizStats() {
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

  private fillMonthlyGaps(rows: AdminMonthlyCount[], start: Date, end: Date) {
    const countsByMonth = new Map(rows.map((row) => [row.month, row.count]));
    const result: AdminMonthlyCount[] = [];
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

  private toChartCounts(rows: AdminMonthlyCount[], start: Date, end: Date) {
    return this.fillMonthlyGaps(rows, start, end).map(({ month, count }) => ({
      label: this.formatMonth(month),
      count,
    }));
  }

  private async getPaymentSummary() {
    const [summary] = await PurchaseModel.aggregate([
      { $match: { status: 'succeeded' } },
      { $group: { _id: null, totalRevenue: { $sum: '$amount' } } },
    ]);
    return { totalRevenue: summary?.totalRevenue ?? 0 };
  }

  private async aggregateMonthlyRevenue(start: Date, end: Date) {
    return PurchaseModel.aggregate([
      { $match: { status: 'succeeded', paidAt: { $gte: start, $lte: end } } },
      { $group: { _id: { year: { $year: '$paidAt' }, month: { $month: '$paidAt' } }, revenue: { $sum: '$amount' } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $project: { _id: 0, month: { $concat: [{ $toString: '$_id.year' }, '-', { $cond: [{ $lt: ['$_id.month', 10] }, { $concat: ['0', { $toString: '$_id.month' }] }, { $toString: '$_id.month' }] }] }, revenue: 1 } },
    ]) as Promise<Array<{ month: string; revenue: number }>>;
  }

  private async aggregateStatusCounts(model: { aggregate(pipeline: unknown[]): Promise<AdminStatusCount[]> }) {
    return model.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, status: '$_id', count: 1 } },
    ]);
  }

  private async aggregateNotificationTypes() {
    return Notification.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, type: '$_id', count: 1 } },
    ]) as Promise<Array<{ type: string; count: number }>>;
  }

  private fillMonthlyRevenueGaps(rows: Array<{ month: string; revenue: number }>, start: Date, end: Date) {
    const revenueByMonth = new Map(rows.map((row) => [row.month, row.revenue]));
    const result: Array<{ label: string; revenue: number }> = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      const month = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      result.push({ label: this.formatMonth(month), revenue: revenueByMonth.get(month) || 0 });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return result;
  }

  private formatMonth(month: string) {
    const [year, monthNumber] = month.split('-').map(Number);
    return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
      .format(new Date(Date.UTC(year, monthNumber - 1, 1)));
  }
}
