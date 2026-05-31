import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from '../services/notifications.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getMyNotifications(
    @CurrentUser() user: JwtPayload,
    @Query('page')       page       = '1',
    @Query('limit')      limit      = '20',
    @Query('onlyUnread') onlyUnread?: string,
  ) {
    const result = await this.notificationsService.getMyNotifications(
      user.id,
      parseInt(page, 10),
      Math.min(parseInt(limit, 10), 50),
      onlyUnread === 'true',
    );
    return {
      message: 'Notifications fetched.',
      data:    result.data,
      meta:    { total: result.total, page: result.page, limit: result.limit, hasMore: result.hasMore, unreadCount: result.unreadCount },
    };
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: JwtPayload) {
    const count = await this.notificationsService.getUnreadCount(user.id);
    return { message: 'Unread count fetched.', data: { count } };
  }

  @Patch(':id/read')
  async markRead(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const data = await this.notificationsService.markAsRead(id, user.id);
    return { message: 'Notification marked as read.', data };
  }

  @Patch('read-all')
  async markAllRead(@CurrentUser() user: JwtPayload) {
    const data = await this.notificationsService.markAllAsRead(user.id);
    return { message: 'All notifications marked as read.', data };
  }
}
