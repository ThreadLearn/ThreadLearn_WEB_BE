import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { IsInt, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReviewsService } from '../services/reviews.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';

class CreateReviewDto {
  @IsInt() @Min(1) @Max(5) rating!: number;
  @IsString() @MaxLength(2000) content!: string;
}

@ApiTags('reviews')
@Controller('courses/:courseId/reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  @ApiOperation({ summary: 'UC57 — list reviews + average + distribution (public).' })
  async list(
    @Param('courseId') courseId: string,
    @Query('page')  page  = '1',
    @Query('limit') limit = '10',
  ) {
    const result = await this.reviews.listForCourse(
      courseId, parseInt(page, 10), parseInt(limit, 10),
    );
    return {
      message: 'Reviews fetched.',
      data:    result.data,
      meta:    {
        total: result.total, averageRating: result.averageRating,
        distribution: result.distribution,
        page: result.page, limit: result.limit, hasMore: result.hasMore,
      },
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'UC56 — create review (requires enroll + ≥50% progress).' })
  async create(
    @Param('courseId') courseId: string,
    @Body() dto: CreateReviewDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.reviews.createReview(user.id, courseId, dto.rating, dto.content);
    return { message: 'Review created.', data, statusCode: 201 };
  }
}
