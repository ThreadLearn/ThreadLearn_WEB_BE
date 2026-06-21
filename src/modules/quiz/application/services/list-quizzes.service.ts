import { Inject, Injectable } from '@nestjs/common';
import { Quiz } from '../../domain/entities/quiz.entity';
import { QUIZ_REPOSITORY, IQuizRepository } from '../../domain/interfaces/quiz.repository';

/**
 * UC36-5: Admin xem danh sách quiz.
 */
@Injectable()
export class ListQuizzesService {
  constructor(
    @Inject(QUIZ_REPOSITORY) private readonly quizRepo: IQuizRepository,
  ) {}

  async execute(): Promise<Quiz[]> {
    return this.quizRepo.findAll();
  }
}
