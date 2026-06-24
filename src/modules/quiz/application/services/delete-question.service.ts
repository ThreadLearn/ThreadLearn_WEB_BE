import { Inject, Injectable } from '@nestjs/common';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import { Quiz } from '../../domain/entities/quiz.entity';
import { QUIZ_REPOSITORY, IQuizRepository } from '../../domain/interfaces/quiz.repository';

/**
 * UC39: Admin xóa 1 câu hỏi khỏi quiz. Hard remove, cần được cập nhật lại
 */
@Injectable()
export class DeleteQuestionService {
  constructor(
    @Inject(QUIZ_REPOSITORY) private readonly quizRepo: IQuizRepository,
  ) { }

  async execute(quizId: string, questionId: string): Promise<Quiz> {
    const quiz = await this.quizRepo.findById(quizId);
    if (!quiz) {
      throw DomainError.notFound(ErrorCode.QUIZ_NOT_FOUND, 'Quiz not found.');
    }

    quiz.removeQuestion(questionId); // business rule ở entity (check min 1 question)
    return this.quizRepo.update(quiz);
  }
}
