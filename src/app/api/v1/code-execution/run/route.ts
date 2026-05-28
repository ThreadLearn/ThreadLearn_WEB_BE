import { apiHandler } from '@/common/api-handler';
import { CodeExecutionController } from '@/modules/code-execution/controllers/code-execution.controller';
import { runCodeSchema } from '@/modules/code-execution/validators/code-execution.validator';

export const POST = apiHandler(CodeExecutionController.runCode, {
  requireAuth: true,
  allowedRoles: ['STUDENT'],
  schema: runCodeSchema,
});
