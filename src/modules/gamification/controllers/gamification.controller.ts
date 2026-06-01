import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GamificationService } from '../services/gamification.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';

@ApiTags('gamification')
@Controller('gamification')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GamificationController {
  constructor(private readonly gamification: GamificationService) {}

  @Get('stats')
  @ApiOperation({ summary: 'UC48/UC49 — current user stats (xp, level, streak).' })
  async myStats(@CurrentUser() user: JwtPayload) {
    // Service throws if no stats doc yet — handle as zero stats for new users.
    try {
      const data = await this.gamification.getStats(user.id);
      return { message: 'Stats fetched.', data };
    } catch {
      return {
        message: 'Stats fetched.',
        data: {
          userId: user.id,
          xp: 0, level: 1, currentStreak: 0, highestStreak: 0,
          lessonsCompleted: 0, quizzesCompleted: 0, coursesCompleted: 0,
          totalLessonsCompleted: 0,
          streak: 0,
        },
      };
    }
  }
}
