import { Inject, Injectable } from '@nestjs/common';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import { Quiz } from '../../domain/entities/quiz.entity';
import { QUIZ_REPOSITORY, IQuizRepository } from '../../domain/interfaces/quiz.repository';

/**
 * Student: Lấy quiz theo lessonId.
 */
@Injectable()
export class GetQuizByLessonService {
  constructor(
    @Inject(QUIZ_REPOSITORY) private readonly quizRepo: IQuizRepository,
  ) {}

  async execute(lessonId: string): Promise<Quiz> {
    const quiz = await this.quizRepo.findByLessonId(lessonId);
    if (!quiz) {
      throw DomainError.notFound(ErrorCode.QUIZ_NOT_FOUND, 'Quiz not found for this lesson.');
    }
    return quiz;
  }
}
