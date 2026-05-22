import apiHandler from '@/common/api-handler';
import { ApiResponse } from '@/common/api-response';
import { QuizAttemptsService } from '@/modules/quiz-attempts/services/quiz-attempts.service';
import { z } from 'zod';

const quizSubmitSchema = z.object({
  quizId: z.string().min(1, 'Quiz ID is required.'),
  answers: z.record(z.coerce.number()),
});

export const POST = apiHandler(
  async (req) => {
    const { id: userId } = req.user!;
    const { quizId, answers } = await req.json();

    const result = await QuizAttemptsService.submitAttempt(userId, quizId, answers);

    return ApiResponse.success({
      message: result.passed
        ? 'Congratulations! You passed the quiz successfully.'
        : 'Attempt recorded. You did not reach the 80% passing threshold yet.',
      data: result,
    });
  },
  {
    requireAuth: true,
    schema: quizSubmitSchema,
  }
);
