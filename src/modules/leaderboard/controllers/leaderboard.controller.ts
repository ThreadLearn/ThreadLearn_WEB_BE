import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../../../common/api-response';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { LeaderboardService } from '../services/leaderboard.service';
import type { AuthenticatedUser } from '../../../common/api-handler';

@ApiTags('Leaderboard')
@Controller('v1/leaderboard')
export class LeaderboardController {
  @Get()
  async getTopRankings(@Query('limit') limit = '10') {
    const rankings = await LeaderboardService.getTopRankings(parseInt(limit, 10));
    return ApiResponse.success({
      message: 'Leaderboard rankings fetched successfully.',
      data: rankings,
    });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  async myRank(@CurrentUser() user: AuthenticatedUser) {
    const data = await LeaderboardService.getMyRank(user.id);
    return ApiResponse.success({ message: 'Rank fetched.', data });
  }
}
