import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuizService } from './services/quiz.service';
import { QuizSchema } from './models/quiz.model';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'Quiz', schema: QuizSchema }])],
  providers: [QuizService],
  exports: [QuizService],
})
export class QuizModule {}
