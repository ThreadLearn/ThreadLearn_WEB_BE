import { Inject, Injectable } from '@nestjs/common';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import { Quiz } from '../../domain/entities/quiz.entity';
import { QUIZ_REPOSITORY, IQuizRepository } from '../../domain/interfaces/quiz.repository';

/**
 * UC36-4: Admin xóa quiz.
 */
@Injectable()
export class DeleteQuizService {
  constructor(
    @Inject(QUIZ_REPOSITORY) private readonly quizRepo: IQuizRepository,
  ) {}

  async execute(quizId: string): Promise<Quiz> {
    const quiz = await this.quizRepo.delete(quizId);
    if (!quiz) {
      throw DomainError.notFound(ErrorCode.QUIZ_NOT_FOUND, 'Quiz not found.');
    }
    return quiz;
  }
}
