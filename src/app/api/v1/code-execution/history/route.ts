import { apiHandler } from '@/common/api-handler';
import { CodeExecutionController } from '@/modules/code-execution/controllers/code-execution.controller';

export const GET = apiHandler(CodeExecutionController.getHistory, {
  requireAuth: true,
  allowedRoles: ['STUDENT'],
});
