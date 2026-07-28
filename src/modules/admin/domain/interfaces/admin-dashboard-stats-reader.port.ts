export const ADMIN_DASHBOARD_STATS_READER = Symbol('ADMIN_DASHBOARD_STATS_READER');

export interface AdminBasicStats {
  totalUsers: number;
  totalCourses: number;
  totalEnrollments: number;
  totalQuizAttempts: number;
}

export interface AdminDashboardStatisticsQuery {
  from?: string;
  to?: string;
  months: number;
}

export interface AdminMonthlyCount {
  month: string;
  count: number;
}

export interface AdminDashboardSummary {
  totalUsers: number;
  totalStudents: number;
  totalAdmins: number;
  activeStudents: number;
  lockedStudents: number;
  verifiedUsers: number;
  unverifiedUsers: number;
  newUsersThisMonth: number;
  totalCourses: number;
  totalLessons: number;
  totalEnrollments: number;
  totalQuizAttempts: number;
  totalAiRequests: number;
  totalNotifications: number;
  averageQuizScore: number;
  quizPassRate: number;
  activeUsersThisMonth: number;
  totalRevenue: number;
  successfulPayments: number;
  lockedUsers: number;
  unreadNotifications: number;
}

export interface AdminDashboardCharts {
  newUsersByMonth: AdminMonthlyCount[];
  enrollmentsByMonth: AdminMonthlyCount[];
  quizAttemptsByMonth: AdminMonthlyCount[];
  coursesCreatedByMonth: AdminMonthlyCount[];
  lessonsCreatedByMonth: AdminMonthlyCount[];
  userGrowth: AdminChartCount[];
  revenueTrend: AdminRevenueTrend[];
  topPurchasedCourses: AdminPurchasedCourse[];
  paymentStatusDistribution: AdminStatusCount[];
  userStatusDistribution: AdminStatusCount[];
  notificationsByType: AdminTypeCount[];
}

export interface AdminChartCount { label: string; count: number; }
export interface AdminRevenueTrend { label: string; revenue: number; }
export interface AdminPurchasedCourse { courseId: string; title: string; purchases: number; revenue: number; }
export interface AdminStatusCount { status: string; count: number; }
export interface AdminTypeCount { type: string; count: number; }

export interface AdminDashboardStatisticsResult {
  summary: AdminDashboardSummary;
  charts: AdminDashboardCharts;
}

export interface IAdminDashboardStatsReader {
  getBasicStats(): Promise<AdminBasicStats>;
  getDashboardStatistics(
    query: AdminDashboardStatisticsQuery,
  ): Promise<AdminDashboardStatisticsResult>;
}
