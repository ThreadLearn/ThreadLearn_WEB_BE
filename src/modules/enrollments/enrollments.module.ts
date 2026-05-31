import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EnrollmentsService } from './services/enrollments.service';
import { EnrollmentSchema } from './models/enrollment.model';
import { CourseSchema } from '../courses/models/course.model';
import { LessonSchema } from '../lessons/models/lesson.model';
import { UserStatsSchema } from '../gamification/models/user-stats.model';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Enrollment', schema: EnrollmentSchema },
      { name: 'Course',     schema: CourseSchema },
      { name: 'Lesson',     schema: LessonSchema },
      { name: 'UserStats',  schema: UserStatsSchema },
    ]),
    NotificationsModule,
  ],
  providers: [EnrollmentsService],
  exports:   [EnrollmentsService],
})
export class EnrollmentsModule {}
