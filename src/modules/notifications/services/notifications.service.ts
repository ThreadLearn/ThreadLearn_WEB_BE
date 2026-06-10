import { Notification, NotificationType } from '../models/notification.model';
import { NotFoundError } from '../../../common/custom-error';
import { getSocketServer } from '../../../socket';

export class NotificationsService {
  static async getNotificationsForUser(userId: string, unreadOnly = false) {
    const query: any = { userId };
    if (unreadOnly) {
      query.isRead = false;
    }
    return await Notification.find(query).sort({ createdAt: -1 });
  }

  static async unreadCount(userId: string) {
    return Notification.countDocuments({ userId, isRead: false });
  }

  static async markAsRead(notificationId: string, userId: string) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    if (!notification) {
      throw new NotFoundError('Notification not found or access denied.');
    }
    return notification;
  }

  static async markAllAsRead(userId: string) {
    await Notification.updateMany({ userId, isRead: false }, { isRead: true, readAt: new Date() });
    return { updated: true };
  }

  static async sendNotification(data: {
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    metadata?: Record<string, unknown>;
    link?: string;
  }) {
    const notification = await Notification.create({
      userId: data.userId,
      title: data.title,
      message: data.message,
      type: data.type,
      metadata: data.metadata,
      link: data.link,
      isRead: false,
    });

    try {
      const io = getSocketServer();
      if (io) {
        io.to(`user:${data.userId}`).emit('notification', {
          id: notification._id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          metadata: notification.metadata,
          link: notification.link,
          createdAt: notification.createdAt,
        });
      }
    } catch {
      // Gracefully bypass if WebSocket server is not running
    }

    return notification;
  }
}
export default NotificationsService;
