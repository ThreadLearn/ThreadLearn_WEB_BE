import { Module } from '@nestjs/common';
import { NotificationsController } from './controllers/notifications.controller';
import { NotificationsService } from './services/notifications.service';
import { QuizPassedNotificationEventHandler } from './application/event-handlers/quiz-passed-notification.event-handler';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, QuizPassedNotificationEventHandler],
  exports: [NotificationsService],
})
export class NotificationsModule {}
