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
  @Get()
  async getNotificationsForUser(
    @CurrentUser() user: AuthenticatedUser,
    @Query('unread') unread?: string
  ) {
    const notifications = await NotificationsService.getNotificationsForUser(
      user.id,
      unread === 'true'
    );

    return ApiResponse.success({
      message: 'Notifications fetched successfully.',
      data: notifications,
    });
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: AuthenticatedUser) {
    const count = await NotificationsService.unreadCount(user.id);
    return ApiResponse.success({ message: 'Unread count fetched.', data: { count } });
  }

  @Patch('read-all')
  async markAllAsRead(@CurrentUser() user: AuthenticatedUser) {
    const result = await NotificationsService.markAllAsRead(user.id);
    return ApiResponse.success({
      message: 'Notifications marked as read.',
      data: result,
    });
  }

  @Get('me')
  async getMine(@CurrentUser() user: AuthenticatedUser, @Query('unread') unread?: string) {
    return this.getNotificationsForUser(user, unread);
  }

  @Patch(':id/read')
  async markAsReadAlias(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.markAsRead(user, id);
  }

  @Patch(':id')
  async markAsRead(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const notification = await NotificationsService.markAsRead(id, user.id);
    return ApiResponse.success({
      message: 'Notification marked as read.',
      data: notification,
    });
  }
}
