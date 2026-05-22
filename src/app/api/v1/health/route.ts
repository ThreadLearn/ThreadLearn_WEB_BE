import { apiHandler } from '@/common/api-handler';
import { ApiResponse } from '@/common/api-response';

export const GET = apiHandler(async () => {
  return ApiResponse.success({
    message: 'ThreadLearn scalable backend is healthy and fully operational.',
    data: {
      uptime: process.uptime(),
      timestamp: new Date(),
      status: 'UP',
    },
  });
});
