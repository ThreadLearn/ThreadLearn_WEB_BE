import mongoose from 'mongoose';
import { Quiz } from '../models/quiz.model';
import { BadRequestError, NotFoundError } from '../../../common/custom-error';

export class QuizService {
  static async getQuizByLesson(lessonId: string) {
    if (!mongoose.isValidObjectId(lessonId)) throw new BadRequestError('Invalid lesson id.');
    const quiz = await Quiz.findOne({ lessonId }).lean();
    if (!quiz) {
      throw new NotFoundError('Quiz not found for this lesson.');
    }
    return this.toStudentQuiz(quiz);
  }

  static async getQuizById(id: string) {
    if (!mongoose.isValidObjectId(id)) throw new BadRequestError('Invalid quiz id.');
    const quiz = await Quiz.findById(id).lean();
    if (!quiz) throw new NotFoundError('Quiz not found.');
    return this.toStudentQuiz(quiz);
  }

  static async createQuiz(data: any) {
    return await Quiz.create({
      lessonId: data.lessonId,
      title: data.title,
      xpReward: data.xpReward || 100,
      timeLimit: data.timeLimit ?? 1800,
      passingScore: data.passingScore ?? 80,
      questions: data.questions,
    });
  }

  private static toStudentQuiz(quiz: any) {
    return {
      ...quiz,
      questions: quiz.questions.map(({ correctAnswerIndex: _answer, ...question }: any) => question),
    };
  }
}
export default QuizService;
