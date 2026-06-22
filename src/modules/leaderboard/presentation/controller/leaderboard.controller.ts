import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../../../../common/api-response';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { GetTopRankingsService } from '../../application/services/get-top-rankings.service';
import { GetMyRankService } from '../../application/services/get-my-rank.service';
import { LeaderboardPresenter } from '../response/leaderboard.presenter';
import type { AuthenticatedUser } from '../../../../common/api-handler';

@ApiTags('Leaderboard')
@Controller('v1/leaderboard')
export class LeaderboardController {
  constructor(
    private readonly getTopRankingsService: GetTopRankingsService,
    private readonly getMyRankService: GetMyRankService,
  ) {}

  @Get()
  async getTopRankings(@Query('limit') limit = '10') {
    const rankings = await this.getTopRankingsService.execute(parseInt(limit, 10));
    return ApiResponse.success({
      message: 'Leaderboard rankings fetched successfully.',
      data: LeaderboardPresenter.toTopResponse(rankings),
    });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  async myRank(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.getMyRankService.execute(user.id);
    return ApiResponse.success({
      message: 'Rank fetched.',
      data: LeaderboardPresenter.toMyRankResponse(data),
    });
  }
}
