import { Quiz } from '../models/quiz.model';
import { NotFoundError } from '../../../common/custom-error';

export class QuizService {
  static async getQuizByLesson(lessonId: string) {
    const quiz = await Quiz.findOne({ lessonId });
    if (!quiz) {
      throw new NotFoundError('Quiz not found for this lesson.');
    }
    return quiz;
  }

  static async createQuiz(data: any) {
    return await Quiz.create({
      lessonId: data.lessonId,
      title: data.title,
      xpReward: data.xpReward || 100,
      questions: data.questions,
    });
  }
}
export default QuizService;
