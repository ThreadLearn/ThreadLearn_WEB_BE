import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LessonsController } from './controllers/lessons.controller';
import { LessonsService } from './services/lessons.service';
import { LessonSchema } from './models/lesson.model';
import { CourseSchema } from '../courses/models/course.model';
import { EnrollmentSchema } from '../enrollments/models/enrollment.model';
import { LessonProgressSchema } from '../enrollments/models/lesson-progress.model';
import { BookmarkSchema } from '../bookmark/models/bookmark.model';
import { NotificationsModule } from '../notifications/notifications.module';
import { CertificatesModule } from '../certificates/certificates.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Lesson',         schema: LessonSchema },
      { name: 'Course',         schema: CourseSchema },
      { name: 'Enrollment',     schema: EnrollmentSchema },
      { name: 'LessonProgress', schema: LessonProgressSchema },
      { name: 'Bookmark',       schema: BookmarkSchema },
    ]),
    NotificationsModule,
    CertificatesModule,
  ],
  controllers: [LessonsController],
  providers:   [LessonsService],
  exports:     [LessonsService],
})
export class LessonsModule {}
