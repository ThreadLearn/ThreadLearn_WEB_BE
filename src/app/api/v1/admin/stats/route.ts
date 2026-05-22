import { apiHandler } from '@/common/api-handler';
import { ApiResponse } from '@/common/api-response';
import { User } from '@/modules/auth/models/user.model';
import { Course } from '@/modules/courses/models/course.model';
import { Enrollment } from '@/modules/enrollments/models/enrollment.model';
import { QuizAttempt } from '@/modules/quiz-attempts/models/quiz-attempt.model';

// GET /api/v1/admin/stats — Admin dashboard aggregation
export const GET = apiHandler(
  async () => {
    const [totalUsers, totalCourses, totalEnrollments, totalAttempts] = await Promise.all([
      User.countDocuments(),
      Course.countDocuments(),
      Enrollment.countDocuments(),
      QuizAttempt.countDocuments(),
    ]);

    return ApiResponse.success({
      message: 'Admin dashboard statistics retrieved.',
      data: {
        totalUsers,
        totalCourses,
        totalEnrollments,
        totalQuizAttempts: totalAttempts,
      },
    });
  },
  {
    requireAuth: true,
    allowedRoles: ['ADMIN'],
  }
);
