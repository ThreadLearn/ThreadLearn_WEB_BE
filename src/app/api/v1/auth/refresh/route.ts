import { apiHandler } from '@/common/api-handler';
import { AuthController } from '@/modules/auth/controllers/auth.controller';
import { refreshTokenSchema } from '@/modules/auth/validators/auth.validator';

export const POST = apiHandler(AuthController.refresh, {
  schema: refreshTokenSchema,
});
