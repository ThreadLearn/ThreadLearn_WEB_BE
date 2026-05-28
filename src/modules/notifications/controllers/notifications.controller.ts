import { AuthenticatedNextRequest } from '../../../common/api-handler';
import { ApiResponse } from '../../../common/api-response';
import { NotificationsService } from '../services/notifications.service';

export class NotificationsController {
  static async getMyNotifications(req: AuthenticatedNextRequest) {
    const { id: userId } = req.user!;
    const { searchParams } = req.nextUrl;

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
    // Accept both ?onlyUnread=true (spec) and ?unread=true (legacy)
    const onlyUnread =
      searchParams.get('onlyUnread') === 'true' || searchParams.get('unread') === 'true';

    const result = await NotificationsService.getMyNotifications(userId, page, limit, onlyUnread);

    return ApiResponse.success({
      message: 'Notifications fetched successfully.',
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        hasMore: result.hasMore,
        unreadCount: result.unreadCount,
      },
    });
  }

  static async getUnreadCount(req: AuthenticatedNextRequest) {
    const { id: userId } = req.user!;
    const count = await NotificationsService.getUnreadCount(userId);

    return ApiResponse.success({
      message: 'Unread count fetched successfully.',
      data: { count },
    });
  }

  static async markRead(
    req: AuthenticatedNextRequest,
    { params }: { params: { id: string } }
  ) {
    const { id: userId } = req.user!;
    const notification = await NotificationsService.markAsRead(params.id, userId);

    return ApiResponse.success({
      message: 'Notification marked as read.',
      data: notification,
    });
  }

  static async markAllRead(req: AuthenticatedNextRequest) {
    const { id: userId } = req.user!;
    const result = await NotificationsService.markAllAsRead(userId);

    return ApiResponse.success({
      message: `${result.updated} notification(s) marked as read.`,
      data: result,
    });
  }
}

export default NotificationsController;
