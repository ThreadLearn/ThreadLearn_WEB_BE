import { Inject, Injectable } from '@nestjs/common';
import { IQuizAttemptRepository, QUIZ_ATTEMPT_REPOSITORY } from '../../domain/interfaces/quiz-attempt.repository';
import { QuizAttempt } from '../../domain/entities/quiz-attempt.entity';

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

  async execute(userId: string): Promise<QuizAttempt[]> {
    return this.quizAttemptRepository.findByUser(userId);
  }
}
