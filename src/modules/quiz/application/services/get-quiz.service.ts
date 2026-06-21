import { Inject, Injectable } from '@nestjs/common';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import { Quiz } from '../../domain/entities/quiz.entity';
import { QUIZ_REPOSITORY, IQuizRepository } from '../../domain/interfaces/quiz.repository';

/**
 * UC36-3: Admin xem chi tiết quiz.
 */
@Injectable()
export class GetQuizService {
  constructor(
    @Inject(QUIZ_REPOSITORY) private readonly quizRepo: IQuizRepository,
  ) {}

  async execute(quizId: string): Promise<Quiz> {
    const quiz = await this.quizRepo.findById(quizId);
    if (!quiz) {
      throw DomainError.notFound(ErrorCode.QUIZ_NOT_FOUND, 'Quiz not found.');
    }
    return quiz;
  }
}
