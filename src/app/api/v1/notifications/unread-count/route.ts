import { apiHandler } from '@/common/api-handler';
import { NotificationsController } from '@/modules/notifications/controllers/notifications.controller';

export const GET = apiHandler(NotificationsController.getUnreadCount, {
  requireAuth: true,
});
