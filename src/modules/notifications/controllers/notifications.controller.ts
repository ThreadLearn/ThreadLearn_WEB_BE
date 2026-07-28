import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../../../common/api-handler';
import { ApiResponse } from '../../../common/api-response';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { NotificationsService } from '../services/notifications.service';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import {
  NotificationListQuery,
  notificationIdParamSchema,
  notificationListQuerySchema,
} from '../notification.dto';

@ApiTags('Notifications')
@Controller('v1/notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('BearerAuth')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}
  @Get()
  async getNotificationsForUser(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(notificationListQuerySchema)) query: NotificationListQuery,
  ) {
    const notifications = await this.notificationsService.getNotificationsForUser(
      user.id,
      query.unread === 'true' ? false : undefined,
      query.page,
      query.limit,
    );

    return ApiResponse.success({
      message: 'Notifications fetched successfully.',
      data: notifications.items,
      meta: {
        page: query.page,
        limit: query.limit,
        total: notifications.total,
        totalPages: Math.max(1, Math.ceil(notifications.total / query.limit)),
        hasMore: query.page * query.limit < notifications.total,
      },
    });
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: AuthenticatedUser) {
    const count = await this.notificationsService.unreadCount(user.id);
    return ApiResponse.success({ message: 'Unread count fetched.', data: { count } });
  }

  @Patch('read-all')
  async markAllAsRead(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.notificationsService.markAllAsRead(user.id);
    return ApiResponse.success({
      message: 'Notifications marked as read.',
      data: result,
    });
  }

  @Get('me')
  async getMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(notificationListQuerySchema)) query: NotificationListQuery,
  ) {
    return this.getNotificationsForUser(user, query);
  }

  @Patch(':id/read')
  async markAsReadAlias(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(notificationIdParamSchema)) id: string,
  ) {
    return this.markAsRead(user, id);
  }

  @Patch(':id')
  async markAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(notificationIdParamSchema)) id: string,
  ) {
    const notification = await this.notificationsService.markAsRead(id, user.id);
    return ApiResponse.success({
      message: 'Notification marked as read.',
      data: notification,
    });
  }
}
