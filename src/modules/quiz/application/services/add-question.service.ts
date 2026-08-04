import { Inject, Injectable } from '@nestjs/common';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import { Quiz } from '../../domain/entities/quiz.entity';
import { QUIZ_REPOSITORY, IQuizRepository } from '../../domain/interfaces/quiz.repository';
import { QuestionInput } from '../dto/quiz.dto';
import { InstructorResourceAccessService, ManagedResourceActor } from '../../../course/application/services/instructor-resource-access.service';

/**
 * UC37: Admin thêm 1 câu hỏi vào quiz đã tồn tại.
 */
@Injectable()
export class AddQuestionService {
  constructor(
    @Inject(QUIZ_REPOSITORY) private readonly quizRepo: IQuizRepository,
    private readonly access?: InstructorResourceAccessService,
  ) {}

  async execute(quizId: string, input: QuestionInput, actor?: ManagedResourceActor): Promise<Quiz> {
    const quiz = await this.quizRepo.findById(quizId);
    if (!quiz) {
      throw DomainError.notFound(ErrorCode.QUIZ_NOT_FOUND, 'Quiz not found.');
    }
    if (actor) await this.access?.assertCanMutateLessonResource(actor, quiz.lessonId);

    quiz.addQuestion(input); // business rule ở entity
    return this.quizRepo.update(quiz);
  }
}
