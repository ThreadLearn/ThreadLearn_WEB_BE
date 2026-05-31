import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AIAnalysisService } from '../services/ai-analysis.service';
import { RequestAnalysisDto } from '../dto/ai-analysis.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';

@ApiTags('ai-analysis')
@Controller('ai-analysis')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STUDENT', 'ADMIN')
@ApiBearerAuth()
export class AIAnalysisController {
  constructor(private readonly aiAnalysisService: AIAnalysisService) {}

  @Post('recommend')
  async recommend(@CurrentUser() user: JwtPayload, @Body() dto: RequestAnalysisDto) {
    const data = await this.aiAnalysisService.requestAnalysis(user.id, dto);
    return { message: 'Analysis complete.', data };
  }

  @Get('history')
  async history(
    @CurrentUser() user: JwtPayload,
    @Query('page')  page  = '1',
    @Query('limit') limit = '10',
  ) {
    const result = await this.aiAnalysisService.getHistory(
      user.id, parseInt(page, 10), parseInt(limit, 10),
    );
    return {
      message: 'History fetched.',
      data:    result.data,
      meta:    { total: result.total, page: result.page, limit: result.limit, hasMore: result.hasMore },
    };
  }
}
