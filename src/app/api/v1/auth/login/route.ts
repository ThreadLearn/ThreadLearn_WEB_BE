import { apiHandler } from '@/common/api-handler';
import { AuthController } from '@/modules/auth/controllers/auth.controller';
import { loginSchema } from '@/modules/auth/validators/auth.validator';

export const POST = apiHandler(AuthController.login, {
  schema: loginSchema,
});
