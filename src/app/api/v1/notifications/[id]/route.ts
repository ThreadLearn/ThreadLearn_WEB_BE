import { apiHandler, AuthenticatedNextRequest } from '@/common/api-handler';
import { ApiResponse } from '@/common/api-response';
import { NotificationsService } from '@/modules/notifications/services/notifications.service';

export const PATCH = apiHandler(
  async (req: AuthenticatedNextRequest, { params }: { params: { id: string } }) => {
    const { id: userId } = req.user!;
    const notification = await NotificationsService.markAsRead(params.id, userId);

    return ApiResponse.success({
      message: 'Notification marked as read.',
      data: notification,
    });
  },
  { requireAuth: true }
);
