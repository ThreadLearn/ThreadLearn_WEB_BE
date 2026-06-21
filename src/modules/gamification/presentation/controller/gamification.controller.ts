import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../../../../common/api-response';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { GamificationService } from '../../application/services/gamification.facade';
import type { AuthenticatedUser } from '../../../../common/api-handler';

@ApiTags('Gamification')
@Controller('v1/gamification')
export class GamificationController {
  constructor(
    private readonly gamificationService: GamificationService,
  ) {}

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  async stats(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.gamificationService.getStats(user.id);
    return ApiResponse.success({ message: 'Stats fetched.', data });
  }
}
