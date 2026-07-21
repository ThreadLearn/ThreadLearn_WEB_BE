import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../../../common/api-response';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../common/api-handler';
import { NotificationType } from '../models/notification.model';
import { NotificationsService } from '../services/notifications.service';

@ApiTags('Admin Notifications')
@ApiBearerAuth('BearerAuth')
@UseGuards(JwtAuthGuard)
@Roles('ADMIN')
@Controller('v1/admin/notifications')
export class AdminNotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser, @Query('page') page = '1', @Query('limit') limit = '20', @Query('isRead') isRead?: string, @Query('type') type?: NotificationType) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const readFilter = isRead === undefined ? undefined : isRead === 'true';
    const result = await this.notifications.getNotificationsForUser(user.id, readFilter, safePage, safeLimit, type);
    return ApiResponse.success({ message: 'Admin notifications fetched.', data: result.items, meta: { page: safePage, limit: safeLimit, total: result.total } });
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: AuthenticatedUser) {
    return ApiResponse.success({ message: 'Unread count fetched.', data: { count: await this.notifications.unreadCount(user.id) } });
  }

  @Patch('read-all')
  async readAll(@CurrentUser() user: AuthenticatedUser) {
    return ApiResponse.success({ message: 'Admin notifications marked as read.', data: await this.notifications.markAllAsRead(user.id) });
  }

  @Patch(':id/read')
  async read(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return ApiResponse.success({ message: 'Notification marked as read.', data: await this.notifications.markAsRead(id, user.id) });
  }
}
