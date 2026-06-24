import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../../../../common/api-response';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { GetStatsService } from '../../application/services/get-stats.service';
import type { AuthenticatedUser } from '../../../../common/api-handler';
import { UserStatsPresenter } from '../response/user-stats.presenter';

@ApiTags('Gamification')
@Controller('v1/gamification')
export class GamificationController {
  constructor(
    private readonly getStatsService: GetStatsService,
  ) {}

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  async stats(@CurrentUser() user: AuthenticatedUser) {
    const entity = await this.getStatsService.execute(user.id);
    return ApiResponse.success({ 
      message: 'Stats fetched.', 
      data: UserStatsPresenter.toResponse(entity) 
    });
  }
}
