import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { INotification, NotificationType } from '../models/notification.model';
import { IUser } from '../../auth/models/user.model';
import { NotFoundError } from '../../../common/custom-error';
import { NotificationsGateway } from '../gateways/notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel('Notification') private notificationModel: Model<INotification>,
    @InjectModel('User')         private userModel:         Model<IUser>,
    private readonly gateway: NotificationsGateway,
  ) {}

  // ── Read ──────────────────────────────────────────────────────────────────

  async getMyNotifications(userId: string, page = 1, limit = 20, onlyUnread = false) {
    const skip  = (page - 1) * limit;
    const query: any = { userId };
    if (onlyUnread) query.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      this.notificationModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      this.notificationModel.countDocuments(query),
      this.notificationModel.countDocuments({ userId, isRead: false }),
    ]);

    return { data: notifications, total, page, limit, hasMore: skip + notifications.length < total, unreadCount };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({ userId, isRead: false });
  }

  // ── Write ─────────────────────────────────────────────────────────────────

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.notificationModel.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true },
      { new: true },
    );
    if (!notification) throw new NotFoundError('Notification not found or access denied.');
    return notification;
  }

  async markAllAsRead(userId: string) {
    const result = await this.notificationModel.updateMany({ userId, isRead: false }, { isRead: true });
    return { updated: result.modifiedCount };
  }

  // ── Notify helpers (called by other modules) ──────────────────────────────

  async notify(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    metadata?: Record<string, any>,
  ) {
    const notification = await this.notificationModel.create({
      userId, type, title, message, metadata, isRead: false,
    });

    try {
      this.gateway.emitToUser(userId, {
        id:        notification._id,
        title:     notification.title,
        message:   notification.message,
        type:      notification.type,
        metadata:  notification.metadata,
        createdAt: notification.createdAt,
      });
    } catch { /* socket down — DB record persisted */ }

    return notification;
  }

  async notifyAdmin(
    type: NotificationType,
    title: string,
    message: string,
    metadata?: Record<string, any>,
  ) {
    const admins = await this.userModel.find({ role: 'ADMIN' }).select('_id').lean();
    await Promise.all(
      admins.map((a) => this.notify(a._id.toString(), type, title, message, metadata)),
    );
  }
}
