import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import mongoose from 'mongoose';
import { IQuiz } from '../models/quiz.model';
import { NotFoundError, BadRequestError } from '../../../common/custom-error';

@Injectable()
export class QuizService {
  constructor(@InjectModel('Quiz') private quizModel: Model<IQuiz>) {}

  async getQuizByLesson(lessonId: string) {
    if (!mongoose.isValidObjectId(lessonId)) throw new NotFoundError('Quiz not found for this lesson.');
    const quiz = await this.quizModel.findOne({ lessonId });
    if (!quiz) throw new NotFoundError('Quiz not found for this lesson.');
    return quiz;
  }

  async getQuizById(quizId: string) {
    if (!mongoose.isValidObjectId(quizId)) throw new NotFoundError('Quiz not found.');
    const quiz = await this.quizModel.findById(quizId);
    if (!quiz) throw new NotFoundError('Quiz not found.');
    return quiz;
  }

  async createQuiz(data: any) {
    if (!data.lessonId) throw new BadRequestError('lessonId is required.');
    if (!Array.isArray(data.questions) || data.questions.length === 0) {
      throw new BadRequestError('questions[] is required.');
    }
    return this.quizModel.create({
      lessonId:  data.lessonId,
      title:     data.title ?? 'Untitled Quiz',
      xpReward:  data.xpReward ?? 100,
      timeLimit: data.timeLimit ?? 600,
      questions: data.questions,
    });
  }

  async updateQuiz(quizId: string, data: any) {
    if (!mongoose.isValidObjectId(quizId)) throw new NotFoundError('Quiz not found.');
    const quiz = await this.quizModel.findByIdAndUpdate(quizId, data, { new: true });
    if (!quiz) throw new NotFoundError('Quiz not found.');
    return quiz;
  }

  async deleteQuiz(quizId: string) {
    if (!mongoose.isValidObjectId(quizId)) throw new NotFoundError('Quiz not found.');
    const deleted = await this.quizModel.findByIdAndDelete(quizId);
    if (!deleted) throw new NotFoundError('Quiz not found.');
    return { deleted: true };
  }
}
