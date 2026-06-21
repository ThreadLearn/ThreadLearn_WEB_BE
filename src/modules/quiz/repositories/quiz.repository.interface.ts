import { IQuiz } from '../models/quiz.model';
import { CreateQuizDto } from '../validators/quiz.validator';

export interface IQuizRepository {
  findById(id: string): Promise<IQuiz | null>;
  findByLessonId(lessonId: string): Promise<IQuiz | null>;
  create(dto: CreateQuizDto): Promise<IQuiz>;
  findAll(): Promise<IQuiz[]>;
  delete(id: string): Promise<IQuiz | null>;
}
