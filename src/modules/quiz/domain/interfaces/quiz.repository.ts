import { Quiz } from '../entities/quiz.entity';
// Port nói ngôn ngữ domain: chỉ phụ thuộc entity + shared. Không phụ thuộc tầng ngoài.

/**
 * PORT quiz repository — nói ngôn ngữ domain (nhận/trả Quiz entity).
 * Infrastructure implements interface này bằng Mongoose.
 */
export interface IQuizRepository {
  findById(id: string): Promise<Quiz | null>;
  findByLessonId(lessonId: string): Promise<Quiz | null>;
  findAll(): Promise<Quiz[]>;
  findByLessonIds?(lessonIds: string[]): Promise<Quiz[]>;
  create(entity: Quiz): Promise<Quiz>;
  update(entity: Quiz): Promise<Quiz>;
}

export const QUIZ_REPOSITORY = Symbol('QUIZ_REPOSITORY');
