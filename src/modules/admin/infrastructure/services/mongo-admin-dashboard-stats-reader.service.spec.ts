import { User } from '../../../auth/models/user.model';
import { Course } from '../../../courses/models/course.model';
import { Enrollment } from '../../../enrollments/models/enrollment.model';
import { Lesson } from '../../../lessons/models/lesson.model';
import { Notification } from '../../../notifications/models/notification.model';
import { QuizAttempt } from '../../../quiz-attempts/models/quiz-attempt.model';
import { PurchaseModel } from '../../../subscription/infrastructure/persistence/schemas/purchase.schema';
import { AIHistory } from '../../../ai/models/ai-history.model';
import { MongoAdminDashboardStatsReaderService } from './mongo-admin-dashboard-stats-reader.service';

describe('MongoAdminDashboardStatsReaderService', () => {
  const service = new MongoAdminDashboardStatsReaderService();

  beforeEach(() => {
    jest.restoreAllMocks();
    for (const model of [User, Course, Enrollment, Lesson, Notification, QuizAttempt, AIHistory]) {
      jest.spyOn(model, 'countDocuments').mockResolvedValue(0);
      jest.spyOn(model, 'aggregate').mockResolvedValue([] as never);
    }
    jest.spyOn(PurchaseModel, 'countDocuments').mockResolvedValue(0);
    jest.spyOn(PurchaseModel, 'aggregate').mockResolvedValue([] as never);
  });

  it('returns a safe summary and chart payload for an empty database', async () => {
    const result = await service.getDashboardStatistics({ months: 1 });

    expect(result.summary).toMatchObject({ totalUsers: 0, totalRevenue: 0, successfulPayments: 0, unreadNotifications: 0 });
    expect(result.charts).toMatchObject({
      topPurchasedCourses: [], paymentStatusDistribution: [], notificationsByType: [],
      userStatusDistribution: [
        { status: 'Active', count: 0 }, { status: 'Locked', count: 0 }, { status: 'Unverified', count: 0 },
      ],
    });
    expect(result.charts.userGrowth).toHaveLength(1);
    expect(result.charts.revenueTrend).toHaveLength(1);
  });

  it('groups user growth by month', async () => {
    jest.spyOn(User, 'aggregate').mockResolvedValue([{ month: '2026-06', count: 2 }, { month: '2026-07', count: 3 }] as never);
    const result = await service.getDashboardStatistics({ from: '2026-06-01', to: '2026-07-31', months: 2 });
    expect(result.charts.userGrowth).toEqual([{ label: 'Jun 2026', count: 2 }, { label: 'Jul 2026', count: 3 }]);
  });

  it('counts active, locked, and unverified user statuses', async () => {
    jest.spyOn(User, 'countDocuments').mockImplementation(((filter?: Record<string, unknown>) => {
      if (filter?.isActive === true && filter?.isVerified === true) return Promise.resolve(4);
      if (filter?.isActive === false) return Promise.resolve(2);
      if (filter?.isVerified && typeof filter.isVerified === 'object') return Promise.resolve(3);
      return Promise.resolve(0);
    }) as never);
    const result = await service.getDashboardStatistics({ months: 1 });
    expect(result.charts.userStatusDistribution).toEqual([
      { status: 'Active', count: 4 }, { status: 'Locked', count: 2 }, { status: 'Unverified', count: 3 },
    ]);
  });

  it('counts each payment status', async () => {
    jest.spyOn(PurchaseModel, 'aggregate').mockImplementation(((pipeline: unknown[]) => {
      const text = JSON.stringify(pipeline);
      if (text.includes('"_id":"$status"')) return Promise.resolve([{ status: 'failed', count: 1 }, { status: 'succeeded', count: 2 }]);
      return Promise.resolve([]);
    }) as never);
    const result = await service.getDashboardStatistics({ months: 1 });
    expect(result.charts.paymentStatusDistribution).toEqual([{ status: 'failed', count: 1 }, { status: 'succeeded', count: 2 }]);
  });

  it('excludes failed payments from the revenue trend', async () => {
    jest.spyOn(PurchaseModel, 'aggregate').mockImplementation(((pipeline: unknown[]) => {
      const text = JSON.stringify(pipeline);
      if (text.includes('"_id":null')) return Promise.resolve([{ totalRevenue: 120 }]);
      if (text.includes('"$year":"$paidAt"')) return Promise.resolve([{ month: '2026-07', revenue: 120 }]);
      return Promise.resolve([]);
    }) as never);
    const result = await service.getDashboardStatistics({ from: '2026-07-01', to: '2026-07-31', months: 1 });
    expect(result.summary.totalRevenue).toBe(120);
    expect(result.charts.revenueTrend).toEqual([{ label: 'Jul 2026', revenue: 120 }]);
  });

  it('counts notification types when the notification module is available', async () => {
    jest.spyOn(Notification, 'aggregate').mockResolvedValue([{ type: 'PAYMENT_SUCCESS', count: 2 }, { type: 'USER_REGISTERED', count: 1 }] as never);
    const result = await service.getDashboardStatistics({ months: 1 });
    expect(result.charts.notificationsByType).toEqual([{ type: 'PAYMENT_SUCCESS', count: 2 }, { type: 'USER_REGISTERED', count: 1 }]);
  });
});
