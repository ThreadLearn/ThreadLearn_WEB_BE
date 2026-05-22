import apiHandler from '@/common/api-handler';
import { LessonsController } from '@/modules/lessons/controllers/lessons.controller';

export const POST = apiHandler(LessonsController.uploadAttachment, {
  requireAuth: true,
  allowedRoles: ['ADMIN'],
});
