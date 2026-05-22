import { Notification } from '../models/notification.model';
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

  static async markAsRead(notificationId: string, userId: string) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true },
      { new: true }
    );
    if (!notification) {
      throw new NotFoundError('Notification not found or access denied.');
    }
    return notification;
  }

  static async sendNotification(data: {
    userId: string;
    title: string;
    message: string;
    type: 'SYSTEM' | 'ACHIEVEMENT' | 'LEADERBOARD' | 'ENROLLMENT';
  }) {
    const notification = await Notification.create({
      userId: data.userId,
      title: data.title,
      message: data.message,
      type: data.type,
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
          createdAt: notification.createdAt,
        });
      }
    } catch (err) {
      // Gracefully bypass if WebSocket server is not running
    }

    return notification;
  }
}
export default NotificationsService;
