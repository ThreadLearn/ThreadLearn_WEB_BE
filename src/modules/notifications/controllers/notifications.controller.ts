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

  @Patch(':id')
  async markAsRead(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const notification = await NotificationsService.markAsRead(id, user.id);
    return ApiResponse.success({
      message: 'Notification marked as read.',
      data: notification,
    });
  }
}
