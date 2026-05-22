import { apiHandler } from '@/common/api-handler';
import { CoursesController } from '@/modules/courses/controllers/courses.controller';

export const GET = apiHandler(CoursesController.getCourses);

export const POST = apiHandler(CoursesController.createCourse, {
  requireAuth: true,
  allowedRoles: ['ADMIN'],
});
