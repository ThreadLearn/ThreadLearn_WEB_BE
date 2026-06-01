import {
  Controller, Get, Post, Put, Patch, Delete,
  Body, Param, Query, UseGuards, Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LessonsService } from '../services/lessons.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../../common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';
import { CreateLessonDto, UpdateLessonDto, ToggleLockDto } from '../dto/lesson.dto';

@ApiTags('lessons')
@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  // ─── UC25 — View lesson (Guest/Student/Admin) ────────────────────────────────

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'UC25 — view lesson; Guest only if isFreePreview.' })
  async detail(
    @Param('id') id: string,
    @Req() req: { user?: JwtPayload },
  ) {
    const data = await this.lessonsService.getLesson(id, {
      userId: req.user?.id,
      role:   req.user?.role as 'STUDENT' | 'ADMIN' | undefined,
    });
    return { message: 'Lesson fetched.', data };
  }

  @Get('by-course/:courseId')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'UC23 helper — list lessons in a course.' })
  async listByCourse(
    @Param('courseId') courseId: string,
    @Req() req: { user?: JwtPayload },
  ) {
    const data = await this.lessonsService.getLessonsByCourse(courseId, {
      role: req.user?.role as 'STUDENT' | 'ADMIN' | undefined,
    });
    return { message: 'Lessons fetched.', data };
  }

  // ─── Admin ──────────────────────────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN') @ApiBearerAuth()
  @ApiOperation({ summary: 'UC19 — add lesson to course (Admin).' })
  async create(@Body() dto: CreateLessonDto) {
    const data = await this.lessonsService.createLesson(dto);
    return { message: 'Lesson created.', data, statusCode: 201 };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN') @ApiBearerAuth()
  @ApiOperation({ summary: 'UC20 — edit/upgrade lesson (Admin).' })
  async update(@Param('id') id: string, @Body() dto: UpdateLessonDto) {
    const data = await this.lessonsService.updateLesson(id, dto);
    return { message: 'Lesson updated.', data };
  }

  @Patch(':id/lock')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN') @ApiBearerAuth()
  @ApiOperation({ summary: 'UC21 — lock/unlock lesson (Admin).' })
  async toggleLock(@Param('id') id: string, @Body() dto: ToggleLockDto) {
    const data = await this.lessonsService.toggleLock(id, dto.isLocked);
    return { message: dto.isLocked ? 'Lesson locked.' : 'Lesson unlocked.', data };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN') @ApiBearerAuth()
  @ApiOperation({ summary: 'UC22 — soft delete lesson (Admin).' })
  async remove(@Param('id') id: string) {
    await this.lessonsService.deleteLesson(id);
    return { message: 'Lesson deleted.' };
  }

  // ─── Student ────────────────────────────────────────────────────────────────

  @Post(':id/complete')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles('STUDENT') @ApiBearerAuth()
  @ApiOperation({ summary: 'UC27 — mark lesson complete (Student).' })
  async complete(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const data = await this.lessonsService.completeLesson(user.id, id);
    return { message: 'Lesson marked as complete.', data };
  }
}
