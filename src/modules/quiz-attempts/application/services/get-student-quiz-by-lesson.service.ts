import { Inject, Injectable } from '@nestjs/common';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import { Quiz } from '../../../quiz/domain/entities/quiz.entity';
import { IQuizRepository, QUIZ_REPOSITORY } from '../../../quiz/domain/interfaces/quiz.repository';
import { LEARNING_ACCESS, ILearningAccess, LearningAccessViewer } from '../../../../shared/domain/interfaces/learning-access.port';

/**
 * UC40: Học viên lấy quiz theo lesson.
 * Application service chịu trách nhiệm đọc qua port; controller không gọi repository.
 */
@Injectable()
export class GetStudentQuizByLessonService {
  constructor(
    @Inject(QUIZ_REPOSITORY)
    private readonly quizRepository: IQuizRepository,
    @Inject(LEARNING_ACCESS)
    private readonly learningAccess: ILearningAccess,
  ) {}

  async execute(lessonId: string, user: LearningAccessViewer): Promise<Quiz> {
    await this.learningAccess.assertLessonInteractionAccess(lessonId, user);
    const quiz = await this.quizRepository.findByLessonId(lessonId);
    if (!quiz) {
      throw DomainError.notFound(ErrorCode.QUIZ_NOT_FOUND, 'Quiz not found for this lesson.');
    }
    return quiz;
  }
}
