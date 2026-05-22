import { apiHandler } from '@/common/api-handler';
import { AuthController } from '@/modules/auth/controllers/auth.controller';
import { registerSchema } from '@/modules/auth/validators/auth.validator';

export const POST = apiHandler(AuthController.register, {
  schema: registerSchema,
});
