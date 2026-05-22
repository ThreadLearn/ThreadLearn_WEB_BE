import { apiHandler } from '@/common/api-handler';
import { UsersController } from '@/modules/users/controllers/users.controller';

export const GET = apiHandler(UsersController.getMyProfile, {
  requireAuth: true,
});
