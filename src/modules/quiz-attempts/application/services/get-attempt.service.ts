import { Inject, Injectable } from '@nestjs/common';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import { IQuizAttemptRepository, QUIZ_ATTEMPT_REPOSITORY } from '../../domain/interfaces/quiz-attempt.repository';
import { QuizAttempt } from '../../domain/entities/quiz-attempt.entity';

/**
 * UC42: View Quiz Result (Student)
 * Service to fetch detail of a specific quiz attempt by a student.
 */
@Injectable()
export class GetAttemptService {
  constructor(
    @Inject(QUIZ_ATTEMPT_REPOSITORY)
    private readonly quizAttemptRepository: IQuizAttemptRepository,
  ) {}

  async execute(userId: string, attemptId: string): Promise<QuizAttempt> {
    const attempt = await this.quizAttemptRepository.findByIdAndUser(attemptId, userId);
    if (!attempt) {
      throw DomainError.notFound(ErrorCode.QUIZ_NOT_FOUND, 'Quiz attempt not found.');
    }
    return attempt;
  }
}
