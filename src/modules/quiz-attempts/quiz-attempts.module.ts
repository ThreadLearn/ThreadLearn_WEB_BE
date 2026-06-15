import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuizAttemptsController } from './controllers/quiz-attempts.controller';
import { QuizAttemptsService } from './services/quiz-attempts.service';
import { Quiz, QuizSchema } from '../quiz/schemas/quiz.schema';

@Module({
  // Đăng ký Quiz forFeature TRỰC TIẾP (không import QuizModule) vì:
  //  1. QuizModule chỉ exports QuizService, KHÔNG re-export MongooseModule,
  //     nên import QuizModule cũng không inject được Model<Quiz>.
  //  2. QuizModule đã imports QuizAttemptsModule → nếu chiều ngược lại
  //     import QuizModule sẽ tạo circular dependency.
  // forFeature trùng schema ở 2 module là pattern hợp lệ — chỉ tạo provider
  // cho DI scope của module này, không đăng ký lại Mongoose model.
  imports: [
    MongooseModule.forFeature([{ name: Quiz.name, schema: QuizSchema }]),
  ],
  controllers: [QuizAttemptsController],
  providers: [QuizAttemptsService],
  exports: [QuizAttemptsService],
})
export class QuizAttemptsModule {}
