import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../../../common/api-handler';
import { ApiResponse } from '../../../common/api-response';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { NotificationsService } from '../services/notifications.service';

@ApiTags('Notifications')
@Controller('v1/notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('BearerAuth')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}
  @Get()
  async getNotificationsForUser(
    @CurrentUser() user: AuthenticatedUser,
    @Query('unread') unread?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const notifications = await this.notificationsService.getNotificationsForUser(
      user.id,
      unread === 'true' ? false : undefined,
      safePage,
      safeLimit,
    );

    return ApiResponse.success({
      message: 'Notifications fetched successfully.',
      data: notifications.items,
      meta: {
        page: safePage,
        limit: safeLimit,
        total: notifications.total,
        totalPages: Math.max(1, Math.ceil(notifications.total / safeLimit)),
        hasMore: safePage * safeLimit < notifications.total,
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
    @Query('unread') unread?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.getNotificationsForUser(user, unread, page, limit);
  }

  @Patch(':id/read')
  async markAsReadAlias(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.markAsRead(user, id);
  }

  @Patch(':id')
  async markAsRead(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const notification = await this.notificationsService.markAsRead(id, user.id);
    return ApiResponse.success({
      message: 'Notification marked as read.',
      data: notification,
    });
  }
}
