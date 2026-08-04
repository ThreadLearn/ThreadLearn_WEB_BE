import { Inject, Injectable } from '@nestjs/common';
import { Quiz } from '../../domain/entities/quiz.entity';
import { QUIZ_REPOSITORY, IQuizRepository } from '../../domain/interfaces/quiz.repository';
import { InstructorResourceAccessService, ManagedResourceActor } from '../../../course/application/services/instructor-resource-access.service';

/**
 * UC36-5: Admin xem danh sách quiz.
 */
@Injectable()
export class ListQuizzesService {
  constructor(
    @Inject(QUIZ_REPOSITORY) private readonly quizRepo: IQuizRepository,
    private readonly access?: InstructorResourceAccessService,
  ) {}

  async execute(actor: ManagedResourceActor = { id: '', role: 'ADMIN' }): Promise<Quiz[]> {
    if (actor.role === 'ADMIN') return this.quizRepo.findAll();
    const lessonIds = await this.access?.listManagedLessonIds(actor) ?? [];
    return this.quizRepo.findByLessonIds
      ? this.quizRepo.findByLessonIds(lessonIds)
      : (await this.quizRepo.findAll()).filter((quiz) => lessonIds.includes(quiz.lessonId));
  }
}
