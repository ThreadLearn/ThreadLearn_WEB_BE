import { apiHandler } from '@/common/api-handler';
import { CoursesController } from '@/modules/courses/controllers/courses.controller';

export const GET = apiHandler(CoursesController.getCourseById);
