import { Inject, Injectable } from '@nestjs/common';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import { Quiz } from '../../../quiz/domain/entities/quiz.entity';
import { IQuizRepository, QUIZ_REPOSITORY } from '../../../quiz/domain/interfaces/quiz.repository';

/**
 * UC40: Học viên lấy quiz theo lesson.
 * Application service chịu trách nhiệm đọc qua port; controller không gọi repository.
 */
@Injectable()
export class GetStudentQuizByLessonService {
  constructor(
    @Inject(QUIZ_REPOSITORY)
    private readonly quizRepository: IQuizRepository,
  ) {}

  async execute(lessonId: string): Promise<Quiz> {
    const quiz = await this.quizRepository.findByLessonId(lessonId);
    if (!quiz) {
      throw DomainError.notFound(ErrorCode.QUIZ_NOT_FOUND, 'Quiz not found for this lesson.');
    }
    return quiz;
  }
}
