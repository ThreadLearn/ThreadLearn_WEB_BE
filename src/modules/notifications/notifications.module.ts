import { Module } from '@nestjs/common';
import { NotificationsController } from './controllers/notifications.controller';
import { AdminNotificationsController } from './controllers/admin-notifications.controller';
import { NotificationsService } from './services/notifications.service';
import { QuizPassedNotificationEventHandler } from './application/event-handlers/quiz-passed-notification.event-handler';
import { SharedEventsModule } from '../../shared/infrastructure/events/shared-events.module';

@Module({
  imports: [SharedEventsModule],
  controllers: [NotificationsController, AdminNotificationsController],
  providers: [NotificationsService, QuizPassedNotificationEventHandler],
  exports: [NotificationsService],
})
export class NotificationsModule {}
