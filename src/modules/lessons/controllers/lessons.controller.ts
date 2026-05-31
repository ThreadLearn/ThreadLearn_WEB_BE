import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { LessonsService } from '../services/lessons.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('lessons')
@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Get(':id')
  async getLessonById(@Param('id') id: string) {
    const data = await this.lessonsService.getLesson(id);
    return { message: 'Lesson fetched.', data };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  async createLesson(@Body() body: any) {
    const data = await this.lessonsService.createLesson(body);
    return { message: 'Lesson created.', data, statusCode: 201 };
  }
}
