import { AuthenticatedNextRequest } from '../../../common/api-handler';
import { ApiResponse } from '../../../common/api-response';
import { CoursesService } from '../services/courses.service';

export class CoursesController {
  static async getCourses(req: AuthenticatedNextRequest) {
    const { searchParams } = req.nextUrl;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const search = searchParams.get('search') || '';

    const result = await CoursesService.listCourses(page, limit, search);

    return ApiResponse.success({
      message: 'Courses fetched successfully.',
      data: result.courses,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  }

  static async getCourseById(req: AuthenticatedNextRequest, { params }: { params: { id: string } }) {
    const courseDetail = await CoursesService.getCourseDetail(params.id);
    return ApiResponse.success({
      message: 'Course details fetched successfully.',
      data: courseDetail,
    });
  }

  static async createCourse(req: AuthenticatedNextRequest) {
    const body = await req.json();
    const course = await CoursesService.createCourse(body);
    return ApiResponse.success({
      message: 'Course created successfully.',
      data: course,
      statusCode: 201,
    });
  }
}
export default CoursesController;
