import { AuthenticatedNextRequest } from '../../../common/api-handler';
import { ApiResponse } from '../../../common/api-response';
import { AIAnalysisService } from '../services/ai-analysis.service';
import { User } from '../../auth/models/user.model';

async function resolveIsPremium(userId: string, role: 'STUDENT' | 'ADMIN'): Promise<boolean> {
  if (role === 'ADMIN') return true; // Admins always get premium quota
  const user = await User.findById(userId).select('isPremium').lean();
  return (user as any)?.isPremium ?? false;
}

export class AIAnalysisController {
  static async recommend(req: AuthenticatedNextRequest) {
    const { id: userId, role } = req.user!;
    const body = await req.json();

    const result = await AIAnalysisService.requestAnalysis(userId, {
      inputCode: body.inputCode,
      language: body.language,
      codeExecutionId: body.codeExecutionId,
    });

    return ApiResponse.success({
      message: 'Code analysis completed successfully.',
      data: result,
    });
  }

  static async getHistory(req: AuthenticatedNextRequest) {
    const { id: userId, role } = req.user!;
    const isPremium = await resolveIsPremium(userId, role);

    const { searchParams } = req.nextUrl;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50);

    const result = await AIAnalysisService.getHistory(userId, isPremium, page, limit);

    return ApiResponse.success({
      message: 'Analysis history fetched successfully.',
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

export default AIAnalysisController;
