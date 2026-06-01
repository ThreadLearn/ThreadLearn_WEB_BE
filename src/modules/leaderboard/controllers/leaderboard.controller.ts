import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LeaderboardService } from '../services/leaderboard.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';

@ApiTags('leaderboard')
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboard: LeaderboardService) {}

  @Get()
  @ApiOperation({ summary: 'UC50 — top users by XP.' })
  async top(@Query('limit') limit = '50') {
    const data = await this.leaderboard.getTopRankings(
      Math.min(parseInt(limit, 10) || 50, 100),
    );
    return { message: 'Leaderboard fetched.', data };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'UC49 — my rank and XP.' })
  async me(@CurrentUser() user: JwtPayload) {
    const data = await this.leaderboard.getMyRank(user.id);
    return { message: 'Rank fetched.', data };
  }
}
