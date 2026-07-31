import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../../../common/api-response';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../common/api-handler';
import { NotificationsService } from '../services/notifications.service';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import {
  AdminNotificationListQuery,
  adminNotificationListQuerySchema,
  notificationIdParamSchema,
} from '../notification.dto';

@ApiTags('Admin Notifications')
@ApiBearerAuth('BearerAuth')
@UseGuards(JwtAuthGuard)
@Roles('ADMIN')
@Controller('v1/admin/notifications')
export class AdminNotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(adminNotificationListQuerySchema)) query: AdminNotificationListQuery,
  ) {
    const readFilter = query.isRead === undefined ? undefined : query.isRead === 'true';
    const result = await this.notifications.getAdminNotifications(
      user.id,
      readFilter,
      query.page,
      query.limit,
      query.type,
    );
    const totalPages = Math.max(1, Math.ceil(result.total / query.limit));
    return ApiResponse.success({
      message: 'Admin notifications fetched.',
      data: result.items,
      meta: {
        page: query.page,
        limit: query.limit,
        total: result.total,
        totalPages,
        hasMore: query.page < totalPages,
      },
    });
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: AuthenticatedUser) {
    return ApiResponse.success({ message: 'Unread count fetched.', data: { count: await this.notifications.unreadAdminCount(user.id) } });
  }

  @Patch('read-all')
  async readAll(@CurrentUser() user: AuthenticatedUser) {
    return ApiResponse.success({ message: 'Admin notifications marked as read.', data: await this.notifications.markAllAdminAsRead(user.id) });
  }

  @Patch(':id/read')
  async read(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(notificationIdParamSchema)) id: string,
  ) {
    return ApiResponse.success({ message: 'Notification marked as read.', data: await this.notifications.markAdminAsRead(id, user.id) });
  }
}
