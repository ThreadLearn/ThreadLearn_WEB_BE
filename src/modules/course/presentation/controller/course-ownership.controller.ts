import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../../../../common/api-handler';
import { ApiResponse } from '../../../../common/api-response';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe';
import {
  AssignCourseInstructorDto,
  ListCoursesQueryDto,
  assignCourseInstructorSchema,
  courseIdParamSchema,
  listCoursesQuerySchema,
} from '../../application/dto/course.dto';
import { AssignCourseInstructorService } from '../../application/services/assign-course-instructor.service';
import { ListMyInstructorCoursesService } from '../../application/services/list-my-instructor-courses.service';
import { CoursePresenter } from '../response/course.presenter';

@ApiTags('Admin course ownership')
@Controller('v1/admin/courses')
@UseGuards(JwtAuthGuard)
@Roles('ADMIN')
@ApiBearerAuth('BearerAuth')
export class AdminCourseOwnershipController {
  constructor(private readonly assignInstructor: AssignCourseInstructorService) {}

  @Patch(':courseId/instructor')
  @ApiOperation({ summary: 'Assign, reassign, or unassign a Course Instructor.' })
  async assign(
    @Param('courseId', new ZodValidationPipe(courseIdParamSchema)) courseId: string,
    @Body(new ZodValidationPipe(assignCourseInstructorSchema)) body: AssignCourseInstructorDto,
  ) {
    const course = await this.assignInstructor.execute(courseId, body.instructorId);
    return ApiResponse.success({
      message: body.instructorId === null ? 'Course instructor unassigned.' : 'Course instructor assigned.',
      data: CoursePresenter.toResponse(course),
    });
  }
}

@ApiTags('Instructor courses')
@Controller('v1/instructor/courses')
@UseGuards(JwtAuthGuard)
@Roles('INSTRUCTOR')
@ApiBearerAuth('BearerAuth')
export class InstructorCoursesController {
  constructor(private readonly listMyCourses: ListMyInstructorCoursesService) {}

  @Get()
  @ApiOperation({ summary: 'List Courses assigned to the authenticated Instructor.' })
  async listMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listCoursesQuerySchema)) query: ListCoursesQueryDto,
  ) {
    const result = await this.listMyCourses.execute(user.id, query);
    return ApiResponse.success({
      message: 'Assigned courses fetched successfully.',
      data: CoursePresenter.toList(result.items),
      meta: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages },
    });
  }
}
