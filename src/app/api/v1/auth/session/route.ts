import { apiHandler } from '@/common/api-handler';
import { AuthController } from '@/modules/auth/controllers/auth.controller';

export const GET = apiHandler(AuthController.getSessionUser, {
  requireAuth: true,
});
