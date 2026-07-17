import { Inject, Injectable } from '@nestjs/common';
import {
  IQuizAttemptRepository,
  QUIZ_ATTEMPT_REPOSITORY,
  QuizAttemptPageResult,
} from '../../domain/interfaces/quiz-attempt.repository';
import { QuizAttempt } from '../../domain/entities/quiz-attempt.entity';

export interface GetMyAttemptsInput {
  page?: number;
  limit?: number;
}

/**
 * UC43: View Quiz Attempt History (Student)
 * Service to fetch all quiz attempts completed by a specific student.
 */
@Injectable()
export class GetMyAttemptsService {
  constructor(
    @Inject(QUIZ_ATTEMPT_REPOSITORY)
    private readonly quizAttemptRepository: IQuizAttemptRepository,
  ) {}

  async execute(userId: string): Promise<QuizAttempt[]>;
  async execute(userId: string, input: GetMyAttemptsInput): Promise<QuizAttempt[] | QuizAttemptPageResult>;
  async execute(userId: string, input: GetMyAttemptsInput = {}): Promise<QuizAttempt[] | QuizAttemptPageResult> {
    if (input.page !== undefined || input.limit !== undefined) {
      return this.quizAttemptRepository.findByUserPaginated(userId, {
        page: input.page ?? 1,
        limit: input.limit ?? 20,
      });
    }
    return this.quizAttemptRepository.findByUser(userId);
  }
}
