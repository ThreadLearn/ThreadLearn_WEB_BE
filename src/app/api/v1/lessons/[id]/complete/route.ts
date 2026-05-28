import { z } from 'zod';
import { apiHandler } from '@/common/api-handler';
import { ApiResponse } from '@/common/api-response';
import { EnrollmentsService } from '@/modules/enrollments/services/enrollments.service';

const markCompleteSchema = z.object({
  completedLessonsCount: z.number().int().min(0, 'completedLessonsCount must be a non-negative integer.'),
});

export const PATCH = apiHandler(
  async (req, { params }: { params: { id: string } }) => {
    const { id: userId } = req.user!;
    const body = await req.json();

    const result = await EnrollmentsService.markLessonComplete(
      userId,
      params.id,
      body.completedLessonsCount
    );

    return ApiResponse.success({
      message: 'Lesson marked as complete.',
      data: result,
    });
  },
  {
    requireAuth: true,
    allowedRoles: ['STUDENT'],
    schema: markCompleteSchema,
  }
);
