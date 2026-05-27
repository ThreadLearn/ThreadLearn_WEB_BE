import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../../../common/api-response';
import { LeaderboardService } from '../services/leaderboard.service';

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
}
