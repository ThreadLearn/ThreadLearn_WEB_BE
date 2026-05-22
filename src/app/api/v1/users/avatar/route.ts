import { apiHandler } from '@/common/api-handler';
import { UsersController } from '@/modules/users/controllers/users.controller';

export const POST = apiHandler(UsersController.uploadAvatar, {
  requireAuth: true,
});
