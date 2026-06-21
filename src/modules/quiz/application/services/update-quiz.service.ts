import { Inject, Injectable } from '@nestjs/common';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import { Quiz } from '../../domain/entities/quiz.entity';
import { QUIZ_REPOSITORY, IQuizRepository } from '../../domain/interfaces/quiz.repository';
import { UpdateQuizInput } from '../dto/quiz.dto';

/**
 * UC36-2: Admin cập nhật thông tin quiz (title, description, passingScore...).
 */
@Injectable()
export class UpdateQuizService {
  constructor(
    @Inject(QUIZ_REPOSITORY) private readonly quizRepo: IQuizRepository,
  ) {}

  async execute(quizId: string, input: UpdateQuizInput): Promise<Quiz> {
    const quiz = await this.quizRepo.findById(quizId);
    if (!quiz) {
      throw DomainError.notFound(ErrorCode.QUIZ_NOT_FOUND, 'Quiz not found.');
    }

    quiz.updateDetails(input);
    return this.quizRepo.update(quiz);
  }
}
