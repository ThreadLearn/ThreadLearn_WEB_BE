import { IQuizAttempt } from '../../models/quiz-attempt.model';

export interface IQuizAttemptRepository {
  create(data: Partial<IQuizAttempt>): Promise<IQuizAttempt>;
  findByIdAndUser(attemptId: string, userId: string): Promise<IQuizAttempt | null>;
  findByUser(userId: string): Promise<IQuizAttempt[]>;
}
