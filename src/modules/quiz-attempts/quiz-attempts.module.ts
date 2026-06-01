import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuizAttemptsService } from './services/quiz-attempts.service';
import { QuizAttemptSchema } from './models/quiz-attempt.model';
import { QuizSchema } from '../quiz/models/quiz.model';
import { UserStatsSchema } from '../gamification/models/user-stats.model';
import { LessonSchema } from '../lessons/models/lesson.model';
import { EnrollmentSchema } from '../enrollments/models/enrollment.model';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'QuizAttempt', schema: QuizAttemptSchema },
      { name: 'Quiz',        schema: QuizSchema },
      { name: 'UserStats',   schema: UserStatsSchema },
      { name: 'Lesson',      schema: LessonSchema },
      { name: 'Enrollment',  schema: EnrollmentSchema },
    ]),
    NotificationsModule,
  ],
  providers: [QuizAttemptsService],
  exports:   [QuizAttemptsService],
})
export class QuizAttemptsModule {}
