import { Quiz } from '../models/quiz.model';
import { NotFoundError, BadRequestError } from '../../../common/custom-error';
import { CreateQuizDto } from '../schemas/quiz.schema';

export class QuizService {
  static async getQuizByLesson(lessonId: string) {
    const quiz = await Quiz.findOne({ lessonId });
    if (!quiz) {
      throw new NotFoundError('Quiz not found for this lesson.');
    }
    return quiz;
  }

  static async createQuiz(dto: CreateQuizDto) {
    // Check if lesson already has a quiz
    const existing = await Quiz.findOne({ lessonId: dto.lessonId });
    if (existing) {
      throw new BadRequestError('Quiz already exists for this lesson.');
    }

    return await Quiz.create(dto);
  }

  static async updateQuiz(quizId: string, dto: Partial<CreateQuizDto>) {
    const quiz = await Quiz.findByIdAndUpdate(quizId, dto, { new: true });
    if (!quiz) {
      throw new NotFoundError('Quiz not found.');
    }
    return quiz;
  }
}

export default QuizService;
