import { QuizAttempt } from '../entities/quiz-attempt.entity';

export interface QuizAttemptPageOptions {
  page: number;
  limit: number;
}

export interface QuizAttemptPageResult {
  items: QuizAttempt[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * PORT quiz attempt repository — nói ngôn ngữ domain (nhận/trả QuizAttempt entity).
 */
export interface IQuizAttemptRepository {
  create(entity: QuizAttempt): Promise<QuizAttempt>;
  findByIdAndUser(attemptId: string, userId: string): Promise<QuizAttempt | null>;
  findBySessionIdAndUser(sessionId: string, userId: string): Promise<QuizAttempt | null>;
  findByUser(userId: string): Promise<QuizAttempt[]>;
  findByUserPaginated(userId: string, options: QuizAttemptPageOptions): Promise<QuizAttemptPageResult>;
  deleteById(attemptId: string): Promise<void>;
}

export const QUIZ_ATTEMPT_REPOSITORY = Symbol('QUIZ_ATTEMPT_REPOSITORY');
