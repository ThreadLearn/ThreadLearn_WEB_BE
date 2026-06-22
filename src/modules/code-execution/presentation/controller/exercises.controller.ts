import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../../../common/api-handler';
import { ApiResponse } from '../../../../common/api-response';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { ExercisesService } from '../../application/services/exercises.service';

@ApiTags('Exercises')
@Controller('v1/exercises')
export class ExercisesController {
  constructor(private readonly exercises: ExercisesService) {}

  @Get()
  async list(@Query('lessonId') lessonId: string) {
    const data = await this.exercises.listByLesson(lessonId);
    return ApiResponse.success({ message: 'Exercises fetched.', data });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  async getOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const ex = await this.exercises.getById(id);
    if (user.role !== 'ADMIN') {
      const visible = ex.toObject ? ex.toObject() : { ...ex };
      visible.testCases = (visible.testCases ?? []).map((tc: any) =>
        tc.isHidden ? { ...tc, input: '', expectedOutput: '' } : tc,
      );
      return ApiResponse.success({ message: 'Exercise fetched.', data: visible });
    }
    return ApiResponse.success({ message: 'Exercise fetched.', data: ex });
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('BearerAuth')
  async create(@Body() body: any) {
    const ex = await this.exercises.create(body);
    return ApiResponse.success({ message: 'Exercise created.', data: ex, statusCode: 201 });
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('BearerAuth')
  async update(@Param('id') id: string, @Body() body: any) {
    const ex = await this.exercises.update(id, body);
    return ApiResponse.success({ message: 'Exercise updated.', data: ex });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('BearerAuth')
  async remove(@Param('id') id: string) {
    const result = await this.exercises.remove(id);
    return ApiResponse.success({ message: 'Exercise deleted.', data: result });
  }

  @Post(':id/submit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  async submit(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Body() body: { sourceCode: string }) {
    const result = await this.exercises.grade(user.id, id, body?.sourceCode ?? '');
    return ApiResponse.success({ message: 'Exercise graded.', data: result, statusCode: 201 });
  }
}

export default ExercisesController;
