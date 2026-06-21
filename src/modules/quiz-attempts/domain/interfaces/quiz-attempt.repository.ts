import { QuizAttempt } from '../entities/quiz-attempt.entity';

/**
 * PORT quiz attempt repository — nói ngôn ngữ domain (nhận/trả QuizAttempt entity).
 */
export interface IQuizAttemptRepository {
  create(entity: QuizAttempt): Promise<QuizAttempt>;
  findByIdAndUser(attemptId: string, userId: string): Promise<QuizAttempt | null>;
  findByUser(userId: string): Promise<QuizAttempt[]>;
  deleteById(attemptId: string): Promise<void>;
}

export const QUIZ_ATTEMPT_REPOSITORY = Symbol('QUIZ_ATTEMPT_REPOSITORY');
