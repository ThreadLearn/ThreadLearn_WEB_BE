import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { CorrelationIdMiddleware } from '../middlewares/correlation-id.middleware';
import { RateLimitMiddleware } from '../middlewares/rate-limit.middleware';
import { LearningAccessModule } from '../shared/application/learning-access/learning-access.module';
import { DomainEventsModule } from '../shared/application/events/domain-events.module';
import { SocketGateway } from '../socket';
import { AdminModule } from '../modules/admin/admin.module';
import { AIModule } from '../modules/ai/ai.module';
import { AnalyticsModule } from '../modules/analytics/analytics.module';
import { AuthModule } from '../modules/auth/auth.module';
import { BookmarkModule } from '../modules/bookmark/bookmark.module';
import { CertificatesModule } from '../modules/certificates/certificates.module';
import { CommentModule } from '../modules/comment/comment.module';
import { CodeExecutionModule } from '../modules/code-execution/code-execution.module';
import { CourseModule } from '../modules/course/course.module';
import { CoursesModule } from '../modules/courses/courses.module';
import { EnrollmentsModule } from '../modules/enrollments/enrollments.module';
import { GamificationModule } from '../modules/gamification/gamification.module';
import { IDEModule } from '../modules/ide/ide.module';
import { LeaderboardModule } from '../modules/leaderboard/leaderboard.module';
import { LessonsModule } from '../modules/lessons/lessons.module';
import { NotificationsModule } from '../modules/notifications/notifications.module';
import { NotesModule } from '../modules/notes/notes.module';
import { QuizModule } from '../modules/quiz/quiz.module';
import { QuizAttemptsModule } from '../modules/quiz-attempts/quiz-attempts.module';
import { UsersModule } from '../modules/users/users.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    DomainEventsModule,
    LearningAccessModule,
    AdminModule,
    AIModule,
    AnalyticsModule,
    AuthModule,
    BookmarkModule,
    CertificatesModule,
    CodeExecutionModule,
    CommentModule,
    CourseModule,
    CoursesModule,
    EnrollmentsModule,
    GamificationModule,
    IDEModule,
    LeaderboardModule,
    LessonsModule,
    NotificationsModule,
    NotesModule,
    QuizModule,
    QuizAttemptsModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [SocketGateway],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Correlation-id runs first so downstream middlewares + handlers can read req.correlationId.
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
    consumer.apply(RateLimitMiddleware).forRoutes('*');
  }
}
