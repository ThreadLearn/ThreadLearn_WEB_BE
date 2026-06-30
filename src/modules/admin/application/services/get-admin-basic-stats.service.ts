import { Inject, Injectable } from '@nestjs/common';
import { IUserRepository, USER_REPOSITORY } from '../../../auth/domain/interfaces/user.repository';
import {
  ADMIN_DASHBOARD_STATS_READER,
  IAdminDashboardStatsReader,
} from '../../domain/interfaces/admin-dashboard-stats-reader.port';
import {
  GetAdminBasicStatsInput,
  GetAdminBasicStatsResult,
} from '../dto/dashboard-statistics-use-case.dto';
import { assertActiveAdmin } from './admin-access.helper';

@Injectable()
export class GetAdminBasicStatsService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(ADMIN_DASHBOARD_STATS_READER)
    private readonly dashboardStatsReader: IAdminDashboardStatsReader,
  ) {}

  async execute(input: GetAdminBasicStatsInput): Promise<GetAdminBasicStatsResult> {
    const admin = await this.userRepo.findById(input.adminId);
    assertActiveAdmin(admin);

    return this.dashboardStatsReader.getBasicStats();
  }
}
