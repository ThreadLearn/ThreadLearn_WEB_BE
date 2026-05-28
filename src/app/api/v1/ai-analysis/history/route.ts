import { apiHandler } from '@/common/api-handler';
import { AIAnalysisController } from '@/modules/ai-analysis/controllers/ai-analysis.controller';

export const GET = apiHandler(AIAnalysisController.getHistory, {
  requireAuth: true,
  allowedRoles: ['STUDENT', 'ADMIN'],
});
