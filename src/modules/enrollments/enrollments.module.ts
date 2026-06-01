import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EnrollmentsController } from './controllers/enrollments.controller';
import { EnrollmentsService } from './services/enrollments.service';
import { EnrollmentSchema } from './models/enrollment.model';
import { LessonProgressSchema } from './models/lesson-progress.model';
import { CourseSchema } from '../courses/models/course.model';
import { LessonSchema } from '../lessons/models/lesson.model';
import { UserStatsSchema } from '../gamification/models/user-stats.model';
import { UserSchema }      from '../auth/models/user.model';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Enrollment',     schema: EnrollmentSchema },
      { name: 'LessonProgress', schema: LessonProgressSchema },
      { name: 'Course',         schema: CourseSchema },
      { name: 'Lesson',         schema: LessonSchema },
      { name: 'UserStats',      schema: UserStatsSchema },
      { name: 'User',           schema: UserSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [EnrollmentsController],
  providers:   [EnrollmentsService],
  exports:     [EnrollmentsService],
})
export class EnrollmentsModule {}
