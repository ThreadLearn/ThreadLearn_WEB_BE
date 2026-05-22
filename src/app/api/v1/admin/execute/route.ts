import { apiHandler } from '@/common/api-handler';
import { ApiResponse } from '@/common/api-response';
import { CodeExecutionService } from '@/modules/code-execution/services/code-execution.service';
import { z } from 'zod';

const executeSchema = z.object({
  sourceCode: z.string().min(1, 'Source code is required.'),
  languageId: z.number().int().positive('Language ID must be a positive integer.'),
  stdin: z.string().optional(),
});

export const POST = apiHandler(
  async (req) => {
    const body = await req.json();
    const result = await CodeExecutionService.executeCode(body);

    return ApiResponse.success({
      message: 'Code execution completed.',
      data: result,
    });
  },
  {
    requireAuth: true,
    schema: executeSchema,
  }
);
