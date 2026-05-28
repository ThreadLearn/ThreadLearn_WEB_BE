import { Notification, NotificationType } from '../models/notification.model';
import { User } from '../../auth/models/user.model';
import { NotFoundError } from '../../../common/custom-error';
import { getSocketServer } from '../../../socket';

export class NotificationsService {
  // ─── Read ───────────────────────────────────────────────────────────────────

  static async getMyNotifications(
    userId: string,
    page = 1,
    limit = 20,
    onlyUnread = false
  ) {
    const skip = (page - 1) * limit;
    const query: any = { userId };
    if (onlyUnread) query.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ userId, isRead: false }),
    ]);

    return {
      data: notifications,
      total,
      page,
      limit,
      hasMore: skip + notifications.length < total,
      unreadCount,
    };
  }

  static async getUnreadCount(userId: string): Promise<number> {
    return Notification.countDocuments({ userId, isRead: false });
  }

  // ─── Write ──────────────────────────────────────────────────────────────────

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

  static async markAllAsRead(userId: string) {
    const result = await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true }
    );
    return { updated: result.modifiedCount };
  }

  // ─── Notify helpers (called by other modules) ────────────────────────────────

  /** Send a notification to a single user and emit via Socket.IO. */
  static async notify(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    metadata?: Record<string, any>
  ) {
    const notification = await Notification.create({
      userId,
      title,
      message,
      type,
      metadata,
      isRead: false,
    });

    try {
      const io = getSocketServer();
      if (io) {
        io.to(`user:${userId}`).emit('notification', {
          id: notification._id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          metadata: notification.metadata,
          createdAt: notification.createdAt,
        });
      }
    } catch {
      // Socket server may not be running — persist-only fallback is acceptable
    }

    return notification;
  }

  /** Broadcast a notification to every user with role ADMIN. */
  static async notifyAdmin(
    type: NotificationType,
    title: string,
    message: string,
    metadata?: Record<string, any>
  ) {
    const admins = await User.find({ role: 'ADMIN' }).select('_id').lean();
    await Promise.all(
      admins.map((admin) =>
        NotificationsService.notify(admin._id.toString(), type, title, message, metadata)
      )
    );
  }

  // ─── Backward-compat alias ───────────────────────────────────────────────────

  /** @deprecated Use notify() instead. */
  static async sendNotification(data: {
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    metadata?: Record<string, any>;
  }) {
    return NotificationsService.notify(
      data.userId,
      data.type,
      data.title,
      data.message,
      data.metadata
    );
  }
}

export default NotificationsService;
