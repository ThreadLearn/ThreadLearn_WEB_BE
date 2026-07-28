import { Notification, NotificationRecipientRole, NotificationType } from '../models/notification.model';
import { NotFoundError } from '../../../common/custom-error';
import { getSocketServer } from '../../../socket';
import { User } from '../../auth/models/user.model';
import { PlanModel } from '../../subscription/infrastructure/persistence/schemas/plan.schema';
import { Injectable } from '@nestjs/common';
import mongoose from 'mongoose';
import { BadRequestError } from '../../../common/custom-error';

@Injectable()
export class NotificationsService {
  private static readonly ADMIN_NOTIFICATION_TYPES: NotificationType[] = ['USER_REGISTERED', 'PAYMENT_SUCCESS'];

  async getNotificationsForUser(userId: string, isRead?: boolean, page?: number, limit?: number, type?: NotificationType) {
    const query: any = { userId };
    if (isRead !== undefined) query.isRead = isRead;
    if (type) query.type = type;
    const pagination = page && limit ? { skip: (page - 1) * limit, limit } : {};
    const [items, total] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip(pagination.skip ?? 0).limit(pagination.limit ?? 0),
      Notification.countDocuments(query),
    ]);
    return { items, total };
  }

  async unreadCount(userId: string) {
    return Notification.countDocuments({ userId, isRead: false });
  }

  async getAdminNotifications(userId: string, isRead?: boolean, page?: number, limit?: number, type?: NotificationType) {
    const query: Record<string, unknown> = this.adminNotificationScope(userId);
    if (isRead !== undefined) query.isRead = isRead;
    if (type) query.type = type;
    const pagination = page && limit ? { skip: (page - 1) * limit, limit } : {};
    const [items, total] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip(pagination.skip ?? 0).limit(pagination.limit ?? 0),
      Notification.countDocuments(query),
    ]);
    return { items, total };
  }

  async unreadAdminCount(userId: string) {
    return Notification.countDocuments({ ...this.adminNotificationScope(userId), isRead: false });
  }

  async markAsRead(notificationId: string, userId: string) {
    if (!mongoose.isValidObjectId(notificationId)) throw new BadRequestError('Invalid notification id.');
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

  async markAllAsRead(userId: string) {
    await Notification.updateMany({ userId, isRead: false }, { isRead: true, readAt: new Date() });
    return { updated: true };
  }

  async markAdminAsRead(notificationId: string, userId: string) {
    if (!mongoose.isValidObjectId(notificationId)) throw new BadRequestError('Invalid notification id.');
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, ...this.adminNotificationScope(userId) },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    if (!notification) {
      throw new NotFoundError('Notification not found or access denied.');
    }
    return notification;
  }

  async markAllAdminAsRead(userId: string) {
    await Notification.updateMany(
      { ...this.adminNotificationScope(userId), isRead: false },
      { isRead: true, readAt: new Date() }
    );
    return { updated: true };
  }

  static async sendNotification(data: {
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    recipientRole?: NotificationRecipientRole;
    metadata?: Record<string, unknown>;
    link?: string;
    eventKey?: string;
  }) {
    const notification = await Notification.create({
      userId: data.userId,
      recipientRole: data.recipientRole,
      title: data.title,
      message: data.message,
      type: data.type,
      metadata: data.metadata,
      link: data.link,
      eventKey: data.eventKey,
      isRead: false,
    });

    try {
      const io = getSocketServer();
      if (io) {
        const payload = {
          id: notification._id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          metadata: notification.metadata,
          link: notification.link,
          createdAt: notification.createdAt,
        };
        io.to(`user:${data.userId}`).emit('notification', payload);
        io.to(`user:${data.userId}`).emit('notification:new', payload);
      }
    } catch {
      // Gracefully bypass if WebSocket server is not running
    }

    return notification;
  }

  async notifyAdminUserRegistered(userId: string) {
    const user = await User.findById(userId).lean();
    if (!user) return [];
    const admins = await User.find({ role: 'ADMIN', isActive: true }).select('_id').lean();
    return Promise.all(admins.map((admin) => this.createAdminNotification({
      userId: String(admin._id), type: 'USER_REGISTERED', eventKey: `USER_REGISTERED:${userId}`,
      title: 'New user registered', message: `${user.email} has registered a new account.`,
      metadata: { userId, userEmail: user.email, firstName: user.firstName, lastName: user.lastName },
    })));
  }

  async notifyAdminPaymentSuccess(input: { purchaseId: string; userId: string; planId: string }) {
    const [user, plan, admins] = await Promise.all([
      User.findById(input.userId).lean(), PlanModel.findById(input.planId).lean(),
      User.find({ role: 'ADMIN', isActive: true }).select('_id').lean(),
    ]);
    const courseTitle = plan?.name || 'a course';
    return Promise.all(admins.map((admin) => this.createAdminNotification({
      userId: String(admin._id), type: 'PAYMENT_SUCCESS', eventKey: `PAYMENT_SUCCESS:${input.purchaseId}`,
      title: 'Course payment successful', message: `${user?.email || 'A user'} purchased ${courseTitle}.`,
      metadata: { userId: input.userId, userEmail: user?.email, courseId: input.planId, courseTitle, paymentId: input.purchaseId },
    })));
  }

  private async createAdminNotification(data: Parameters<typeof NotificationsService.sendNotification>[0]) {
    try {
      return await NotificationsService.sendNotification({ ...data, recipientRole: 'ADMIN' });
    } catch (error: any) {
      if (error?.code === 11000) return null;
      throw error;
    }
  }

  private adminNotificationScope(userId: string) {
    return {
      userId,
      $or: [
        { recipientRole: 'ADMIN' },
        { type: { $in: NotificationsService.ADMIN_NOTIFICATION_TYPES } },
      ],
    };
  }
}
export default NotificationsService;
