import { Inject, Injectable } from '@nestjs/common';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import { Quiz } from '../../domain/entities/quiz.entity';
import { QUIZ_REPOSITORY, IQuizRepository } from '../../domain/interfaces/quiz.repository';
import { UpdateQuestionInput } from '../dto/quiz.dto';
import { InstructorResourceAccessService, ManagedResourceActor } from '../../../course/application/services/instructor-resource-access.service';

/**
 * UC38: Admin sửa 1 câu hỏi trong quiz.
 */
@Injectable()
export class EditQuestionService {
  constructor(
    @Inject(QUIZ_REPOSITORY) private readonly quizRepo: IQuizRepository,
    private readonly access?: InstructorResourceAccessService,
  ) {}

  async execute(quizId: string, questionId: string, input: UpdateQuestionInput, actor?: ManagedResourceActor): Promise<Quiz> {
    const quiz = await this.quizRepo.findById(quizId);
    if (!quiz) {
      throw DomainError.notFound(ErrorCode.QUIZ_NOT_FOUND, 'Quiz not found.');
    }
    if (actor) await this.access?.assertCanMutateLessonResource(actor, quiz.lessonId);

    quiz.editQuestion(questionId, input); // business rule ở entity
    return this.quizRepo.update(quiz);
  }
}
