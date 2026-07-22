import { Notification } from '../models/notification.model';
import { NotificationsService } from './notifications.service';

describe('NotificationsService admin notification scope', () => {
  const service = new NotificationsService();
  const adminId = '507f1f77bcf86cd799439011';

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('lists only ADMIN notifications and legacy admin event types', async () => {
    const findQuery = jest.fn().mockReturnThis();
    const sort = jest.fn().mockReturnThis();
    const skip = jest.fn().mockReturnThis();
    const limit = jest.fn().mockResolvedValue([]);
    jest.spyOn(Notification, 'find').mockImplementation(findQuery as never);
    findQuery.mockReturnValue({ sort, skip, limit });
    const countDocuments = jest.spyOn(Notification, 'countDocuments').mockResolvedValue(2);

    await service.getAdminNotifications(adminId, undefined, 1, 20);

    const expectedScope = {
      userId: adminId,
      $or: [
        { recipientRole: 'ADMIN' },
        { type: { $in: ['USER_REGISTERED', 'PAYMENT_SUCCESS'] } },
      ],
    };
    expect(findQuery).toHaveBeenCalledWith(expectedScope);
    expect(countDocuments).toHaveBeenCalledWith(expectedScope);
  });

  it('does not count unread student notifications for an admin', async () => {
    const countDocuments = jest.spyOn(Notification, 'countDocuments').mockResolvedValue(2);

    await service.unreadAdminCount(adminId);

    expect(countDocuments).toHaveBeenCalledWith({
      userId: adminId,
      isRead: false,
      $or: [
        { recipientRole: 'ADMIN' },
        { type: { $in: ['USER_REGISTERED', 'PAYMENT_SUCCESS'] } },
      ],
    });
  });

  it('does not mark a student notification as read from an admin endpoint', async () => {
    const findOneAndUpdate = jest.spyOn(Notification, 'findOneAndUpdate').mockResolvedValue(null);

    await expect(service.markAdminAsRead('507f1f77bcf86cd799439012', adminId)).rejects.toThrow(
      'Notification not found or access denied.'
    );
    expect(findOneAndUpdate.mock.calls[0][0]).toEqual(expect.objectContaining({
      userId: adminId,
      $or: [
        { recipientRole: 'ADMIN' },
        { type: { $in: ['USER_REGISTERED', 'PAYMENT_SUCCESS'] } },
      ],
    }));
  });

  it('marks only unread admin notifications as read', async () => {
    const updateMany = jest.spyOn(Notification, 'updateMany').mockResolvedValue({} as never);

    await service.markAllAdminAsRead(adminId);

    expect(updateMany.mock.calls[0][0]).toEqual({
      userId: adminId,
      isRead: false,
      $or: [
        { recipientRole: 'ADMIN' },
        { type: { $in: ['USER_REGISTERED', 'PAYMENT_SUCCESS'] } },
      ],
    });
  });

  it('tags newly created admin notifications with the ADMIN recipient role', async () => {
    const create = jest.spyOn(Notification, 'create').mockResolvedValue({
      _id: '507f1f77bcf86cd799439013',
      title: 'New user registered',
      message: 'student@example.com has registered a new account.',
      type: 'USER_REGISTERED',
      createdAt: new Date(),
    } as never);

    await (service as any).createAdminNotification({
      userId: adminId,
      title: 'New user registered',
      message: 'student@example.com has registered a new account.',
      type: 'USER_REGISTERED',
    });

    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      recipientRole: 'ADMIN',
      type: 'USER_REGISTERED',
    }));
  });
});
