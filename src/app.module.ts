import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  appConfig, dbConfig, jwtConfig,
  redisConfig, judge0Config, openaiConfig,
} from './config/env.config';
import { DatabaseModule }      from './config/database.module';
import { RedisModule }         from './config/redis.module';
import { AuthModule }          from './modules/auth/auth.module';
import { UsersModule }         from './modules/users/users.module';
import { CoursesModule }       from './modules/courses/courses.module';
import { LessonsModule }       from './modules/lessons/lessons.module';
import { EnrollmentsModule }   from './modules/enrollments/enrollments.module';
import { GamificationModule }  from './modules/gamification/gamification.module';
import { LeaderboardModule }   from './modules/leaderboard/leaderboard.module';
import { QuizModule }          from './modules/quiz/quiz.module';
import { QuizAttemptsModule }  from './modules/quiz-attempts/quiz-attempts.module';
// DEV3 modules
import { CommentModule }       from './modules/comment/comment.module';
import { BookmarkModule }      from './modules/bookmark/bookmark.module';
import { NoteModule }          from './modules/note/note.module';
import { CodeExecutionModule } from './modules/code-execution/code-execution.module';
import { AIAnalysisModule }    from './modules/ai-analysis/ai-analysis.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, dbConfig, jwtConfig, redisConfig, judge0Config, openaiConfig],
    }),
    DatabaseModule,
    RedisModule,
    // Core
    AuthModule,
    UsersModule,
    CoursesModule,
    LessonsModule,
    EnrollmentsModule,
    GamificationModule,
    LeaderboardModule,
    QuizModule,
    QuizAttemptsModule,
    // DEV3
    CommentModule,
    BookmarkModule,
    NoteModule,
    CodeExecutionModule,
    AIAnalysisModule,
    NotificationsModule,
  ],
})
export class AppModule {}
