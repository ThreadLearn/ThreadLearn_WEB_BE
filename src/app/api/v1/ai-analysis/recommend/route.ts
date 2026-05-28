import { apiHandler } from '@/common/api-handler';
import { AIAnalysisController } from '@/modules/ai-analysis/controllers/ai-analysis.controller';
import { requestAnalysisSchema } from '@/modules/ai-analysis/validators/ai-analysis.validator';

export const POST = apiHandler(AIAnalysisController.recommend, {
  requireAuth: true,
  allowedRoles: ['STUDENT', 'ADMIN'],
  schema: requestAnalysisSchema,
});
