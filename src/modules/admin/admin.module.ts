import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './controllers/admin.controller';
import { AdminService } from './services/admin.service';
import { UserSchema }       from '../auth/models/user.model';
import { CourseSchema }     from '../courses/models/course.model';
import { LessonSchema }     from '../lessons/models/lesson.model';
import { EnrollmentSchema } from '../enrollments/models/enrollment.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'User',       schema: UserSchema },
      { name: 'Course',     schema: CourseSchema },
      { name: 'Lesson',     schema: LessonSchema },
      { name: 'Enrollment', schema: EnrollmentSchema },
    ]),
  ],
  controllers: [AdminController],
  providers:   [AdminService],
})
export class AdminModule {}
