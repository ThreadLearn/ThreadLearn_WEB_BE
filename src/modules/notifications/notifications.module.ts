import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationsController } from './controllers/notifications.controller';
import { NotificationsService } from './services/notifications.service';
import { NotificationsGateway } from './gateways/notifications.gateway';
import { NotificationSchema } from './models/notification.model';
import { UserSchema } from '../auth/models/user.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Notification', schema: NotificationSchema },
      { name: 'User',         schema: UserSchema },
    ]),
    JwtModule.registerAsync({
      imports:    [ConfigModule],
      useFactory: (c: ConfigService) => ({ secret: c.get<string>('jwt.accessSecret') }),
      inject:     [ConfigService],
    }),
  ],
  controllers: [NotificationsController],
  providers:   [NotificationsService, NotificationsGateway],
  exports:     [NotificationsService],
})
export class NotificationsModule {}
