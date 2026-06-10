import mongoose from 'mongoose';
import { BadRequestError, NotFoundError } from '../../../common/custom-error';
import { Quiz } from '../models/quiz.model';
import { CreateQuizDto, UpdateQuizDto } from '../schemas/quiz.schema';

export class QuizService {
  async getQuizByLesson(lessonId: string) {
    this.assertObjectId(lessonId, 'lesson');
    const quiz = await Quiz.findOne({ lessonId }).lean();
    if (!quiz) throw new NotFoundError('Quiz not found for this lesson.');
    return this.toStudentQuiz(quiz);
  }

  async createQuiz(dto: CreateQuizDto) {
    this.assertObjectId(dto.lessonId, 'lesson');
    const existing = await Quiz.exists({ lessonId: dto.lessonId });
    if (existing) throw new BadRequestError('Quiz already exists for this lesson.');
    return Quiz.create(dto);
  }

  async updateQuiz(quizId: string, dto: UpdateQuizDto) {
    this.assertObjectId(quizId, 'quiz');
    const quiz = await Quiz.findByIdAndUpdate(
      quizId,
      { $set: dto },
      { new: true, runValidators: true }
    );
    if (!quiz) throw new NotFoundError('Quiz not found.');
    return quiz;
  }

  async getQuizById(quizId: string) {
    this.assertObjectId(quizId, 'quiz');
    const quiz = await Quiz.findById(quizId).lean();
    if (!quiz) throw new NotFoundError('Quiz not found.');
    return quiz;
  }

  async deleteQuiz(quizId: string) {
    this.assertObjectId(quizId, 'quiz');
    const quiz = await Quiz.findByIdAndDelete(quizId).lean();
    if (!quiz) throw new NotFoundError('Quiz not found.');
    return quiz;
  }

  private assertObjectId(id: string, resource: string) {
    if (!mongoose.isValidObjectId(id)) {
      throw new BadRequestError(`Invalid ${resource} id.`);
    }
  }

  private toStudentQuiz(quiz: any) {
    return {
      ...quiz,
      questions: quiz.questions.map(({ correctAnswerIndex: _answer, ...question }: any) => question),
    };
  }
}

export default QuizService;
