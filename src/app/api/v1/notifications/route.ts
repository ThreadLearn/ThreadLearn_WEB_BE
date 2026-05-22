import { apiHandler, AuthenticatedNextRequest } from '@/common/api-handler';
import { ApiResponse } from '@/common/api-response';
import { NotificationsService } from '@/modules/notifications/services/notifications.service';

export const GET = apiHandler(
  async (req: AuthenticatedNextRequest) => {
    const { id: userId } = req.user!;
    const unreadOnly = req.nextUrl.searchParams.get('unread') === 'true';
    const notifications = await NotificationsService.getNotificationsForUser(userId, unreadOnly);

    return ApiResponse.success({
      message: 'Notifications fetched successfully.',
      data: notifications,
    });
  },
  { requireAuth: true }
);
