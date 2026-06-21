import { Inject, Injectable } from '@nestjs/common';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import { Quiz } from '../../domain/entities/quiz.entity';
import { QUIZ_REPOSITORY, IQuizRepository } from '../../domain/interfaces/quiz.repository';
import { UpdateQuestionInput } from '../dto/quiz.dto';

/**
 * UC38: Admin sửa 1 câu hỏi trong quiz.
 */
@Injectable()
export class EditQuestionService {
  constructor(
    @Inject(QUIZ_REPOSITORY) private readonly quizRepo: IQuizRepository,
  ) {}

  async execute(quizId: string, questionId: string, input: UpdateQuestionInput): Promise<Quiz> {
    const quiz = await this.quizRepo.findById(quizId);
    if (!quiz) {
      throw DomainError.notFound(ErrorCode.QUIZ_NOT_FOUND, 'Quiz not found.');
    }

    quiz.editQuestion(questionId, input); // business rule ở entity
    return this.quizRepo.update(quiz);
  }
}
