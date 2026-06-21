import { IQuiz } from '../models/quiz.model';
import { CreateQuizDto, QuestionDto } from '../validators/quiz.validator';

export interface IQuizRepository {
  findById(id: string): Promise<IQuiz | null>;
  findByLessonId(lessonId: string): Promise<IQuiz | null>;
  create(dto: CreateQuizDto): Promise<IQuiz>;
  findAll(): Promise<IQuiz[]>;
  delete(id: string): Promise<IQuiz | null>;
  addQuestion(quizId: string, question: QuestionDto): Promise<IQuiz | null>;
  editQuestion(quizId: string, questionId: string, setFields: Record<string, any>): Promise<IQuiz | null>;
  deleteQuestion(quizId: string, questionId: string): Promise<IQuiz | null>;
}
