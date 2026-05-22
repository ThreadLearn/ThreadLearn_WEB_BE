import { apiHandler, AuthenticatedNextRequest } from '@/common/api-handler';
import { ApiResponse } from '@/common/api-response';
import { AIService } from '@/modules/ai/services/ai.service';
import { z } from 'zod';

const aiRecSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required.'),
});

export const POST = apiHandler(
  async (req: AuthenticatedNextRequest) => {
    const { id: userId } = req.user!;
    const { courseId } = await req.json();

    const recommendation = await AIService.requestRecommendation(userId, courseId);

    return ApiResponse.success({
      message: 'AI personalized study recommendations generated successfully.',
      data: recommendation,
    });
  },
  {
    requireAuth: true,
    schema: aiRecSchema,
  }
);

export const GET = apiHandler(
  async (req: AuthenticatedNextRequest) => {
    const { id: userId } = req.user!;
    const histories = await AIService.getHistoryLogs(userId);

    return ApiResponse.success({
      message: 'AI interactive history logs fetched successfully.',
      data: histories,
    });
  },
  {
    requireAuth: true,
  }
);
