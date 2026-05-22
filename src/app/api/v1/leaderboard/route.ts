import { apiHandler, AuthenticatedNextRequest } from '@/common/api-handler';
import { ApiResponse } from '@/common/api-response';
import { LeaderboardService } from '@/modules/leaderboard/services/leaderboard.service';

export const GET = apiHandler(async (req: AuthenticatedNextRequest) => {
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '10', 10);
  const rankings = await LeaderboardService.getTopRankings(limit);

  return ApiResponse.success({
    message: 'Leaderboard rankings fetched successfully.',
    data: rankings,
  });
});
