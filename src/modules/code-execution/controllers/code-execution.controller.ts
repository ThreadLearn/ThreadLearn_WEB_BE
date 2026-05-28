import { AuthenticatedNextRequest } from '../../../common/api-handler';
import { ApiResponse } from '../../../common/api-response';
import { CodeExecutionService } from '../services/code-execution.service';
import { BadRequestError } from '../../../common/custom-error';
import { Judge0Language } from '../services/judge0.service';

export class CodeExecutionController {
  static async getExercise(
    req: AuthenticatedNextRequest,
    { params }: { params: { lessonId: string } }
  ) {
    const exercise = await CodeExecutionService.getExerciseByLesson(params.lessonId);

    return ApiResponse.success({
      message: 'Exercise fetched successfully.',
      data: exercise,
    });
  }

  static async runCode(req: AuthenticatedNextRequest) {
    const { id: userId } = req.user!;
    const body = await req.json();

    const result = await CodeExecutionService.runAgainstExercise(
      userId,
      body.exerciseId,
      body.code,
      body.language as Judge0Language
    );

    return ApiResponse.success({
      message:
        result.verdict === 'PASS'
          ? 'All test cases passed!'
          : result.verdict === 'PARTIAL'
            ? `${result.passedCases}/${result.totalCases} test cases passed.`
            : result.verdict === 'ERROR'
              ? 'Runtime error during execution.'
              : 'No test cases passed.',
      data: result,
    });
  }

  static async getHistory(req: AuthenticatedNextRequest) {
    const { id: userId } = req.user!;
    const { searchParams } = req.nextUrl;

    const exerciseId = searchParams.get('exerciseId') || '';
    if (!exerciseId) {
      throw new BadRequestError('exerciseId query parameter is required.');
    }

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50);

    const result = await CodeExecutionService.getHistory(userId, exerciseId, page, limit);

    return ApiResponse.success({
      message: 'Submission history fetched successfully.',
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        hasMore: result.hasMore,
      },
    });
  }
}

export default CodeExecutionController;
