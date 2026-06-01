import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuizController } from './controllers/quiz.controller';
import { QuizService } from './services/quiz.service';
import { QuizSchema } from './models/quiz.model';
import { QuizAttemptsModule } from '../quiz-attempts/quiz-attempts.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Quiz', schema: QuizSchema }]),
    QuizAttemptsModule,
  ],
  controllers: [QuizController],
  providers:   [QuizService],
  exports:     [QuizService],
})
export class QuizModule {}
