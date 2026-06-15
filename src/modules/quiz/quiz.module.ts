import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuizController } from './controllers/quiz.controller';
import { QuizService } from './services/quiz.service';
import { QuizAttemptsModule } from '../quiz-attempts/quiz-attempts.module';
import { Quiz, QuizSchema } from './schemas/quiz.schema';
// Lesson PHẢI import từ schema NestJS (class) — KHÔNG từ model thuần.
// QuizService inject @InjectModel(Lesson.name) với `Lesson` cũng từ schema này;
// nếu module dùng `Lesson` từ models/lesson.model.ts thì `.name` không khớp
// → DI token mismatch → "Nest can't resolve LessonModel".
import { Lesson, LessonSchema } from '../lessons/schemas/lesson.schema';

@Module({
  imports: [
    QuizAttemptsModule,
    MongooseModule.forFeature([
      { name: Quiz.name, schema: QuizSchema },
      { name: Lesson.name, schema: LessonSchema },
    ]),
  ],
  controllers: [QuizController],
  providers: [QuizService],
  exports: [QuizService],
})
export class QuizModule {}
