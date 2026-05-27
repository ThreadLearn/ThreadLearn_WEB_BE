import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RateLimitMiddleware } from '../middlewares/rate-limit.middleware';
import { SocketGateway } from '../socket';
import { AdminModule } from '../modules/admin/admin.module';
import { AIModule } from '../modules/ai/ai.module';
import { AnalyticsModule } from '../modules/analytics/analytics.module';
import { AuthModule } from '../modules/auth/auth.module';
import { CodeExecutionModule } from '../modules/code-execution/code-execution.module';
import { CoursesModule } from '../modules/courses/courses.module';
import { EnrollmentsModule } from '../modules/enrollments/enrollments.module';
import { GamificationModule } from '../modules/gamification/gamification.module';
import { IDEModule } from '../modules/ide/ide.module';
import { LeaderboardModule } from '../modules/leaderboard/leaderboard.module';
import { LessonsModule } from '../modules/lessons/lessons.module';
import { NotificationsModule } from '../modules/notifications/notifications.module';
import { QuizModule } from '../modules/quiz/quiz.module';
import { QuizAttemptsModule } from '../modules/quiz-attempts/quiz-attempts.module';
import { UsersModule } from '../modules/users/users.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AdminModule,
    AIModule,
    AnalyticsModule,
    AuthModule,
    CodeExecutionModule,
    CoursesModule,
    EnrollmentsModule,
    GamificationModule,
    IDEModule,
    LeaderboardModule,
    LessonsModule,
    NotificationsModule,
    QuizModule,
    QuizAttemptsModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [SocketGateway],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RateLimitMiddleware).forRoutes('*');
  }
}
