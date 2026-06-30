import {
  AdminBasicStats,
  AdminDashboardStatisticsQuery,
  AdminDashboardStatisticsResult,
} from '../../domain/interfaces/admin-dashboard-stats-reader.port';

export interface GetAdminBasicStatsInput {
  adminId: string;
}

export type GetAdminBasicStatsResult = AdminBasicStats;

export interface GetAdminDashboardStatisticsInput extends AdminDashboardStatisticsQuery {
  adminId: string;
}

export type GetAdminDashboardStatisticsResult = AdminDashboardStatisticsResult;
