import { apiHandler } from '@/common/api-handler';
import { NotificationsController } from '@/modules/notifications/controllers/notifications.controller';

export const PATCH = apiHandler(NotificationsController.markRead, {
  requireAuth: true,
});
