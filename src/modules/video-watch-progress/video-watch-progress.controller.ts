import { Body, Controller, Delete, Get, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../../common/api-handler';
import { ApiResponse } from '../../common/api-response';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  LessonIdQueryDto,
  lessonIdQuerySchema,
  SaveVideoWatchProgressDto,
  saveVideoWatchProgressSchema,
} from './video-watch-progress.dto';
import { VideoWatchProgressService } from './video-watch-progress.service';

@ApiTags('Video watch progress')
@Controller('v1/video-watch-progress')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('BearerAuth')
export class VideoWatchProgressController {
  constructor(private readonly progress: VideoWatchProgressService) {}

  @Get()
  async get(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(lessonIdQuerySchema)) query: LessonIdQueryDto
  ) {
    return ApiResponse.success({
      message: 'Video watch progress fetched.',
      data: await this.progress.getMine(user, query.lessonId),
    });
  }

  @Put()
  async save(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(saveVideoWatchProgressSchema)) body: SaveVideoWatchProgressDto
  ) {
    return ApiResponse.success({
      message: 'Video watch progress saved.',
      data: await this.progress.saveMine(user, body),
    });
  }

  @Delete()
  async reset(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(lessonIdQuerySchema)) query: LessonIdQueryDto
  ) {
    return ApiResponse.success({
      message: 'Video watch progress reset.',
      data: await this.progress.resetMine(user, query.lessonId),
    });
  }
}
