import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IQuiz } from '../models/quiz.model';
import { NotFoundError } from '../../../common/custom-error';

@Injectable()
export class QuizService {
  constructor(@InjectModel('Quiz') private quizModel: Model<IQuiz>) {}

  async getQuizByLesson(lessonId: string) {
    const quiz = await this.quizModel.findOne({ lessonId });
    if (!quiz) throw new NotFoundError('Quiz not found for this lesson.');
    return quiz;
  }

  async createQuiz(data: any) {
    return this.quizModel.create({
      lessonId:  data.lessonId,
      title:     data.title,
      xpReward:  data.xpReward ?? 100,
      questions: data.questions,
    });
  }
}
