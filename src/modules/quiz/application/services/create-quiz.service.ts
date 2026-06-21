import { Inject, Injectable } from '@nestjs/common';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import { Quiz } from '../../domain/entities/quiz.entity';
import { QUIZ_REPOSITORY, IQuizRepository } from '../../domain/interfaces/quiz.repository';
import {
  LESSON_READ_PORT,
  ILessonReadPort,
} from '../../../lessons/domain/interfaces/lesson-read.port';
import { CreateQuizInput } from '../dto/quiz.dto';

/**
 * UC36-1: Admin tạo quiz cho một lesson.
 */
@Injectable()
export class CreateQuizService {
  constructor(
    @Inject(QUIZ_REPOSITORY) private readonly quizRepo: IQuizRepository,
    @Inject(LESSON_READ_PORT) private readonly lessonRead: ILessonReadPort,
  ) {}

  async execute(input: CreateQuizInput): Promise<Quiz> {
    // Check lesson tồn tại qua port
    const lesson = await this.lessonRead.getForCompletion(input.lessonId);
    if (!lesson) {
      throw DomainError.notFound(ErrorCode.LESSON_NOT_FOUND, 'Lesson not found.');
    }

    // Check quiz chưa tồn tại cho lesson
    const existing = await this.quizRepo.findByLessonId(input.lessonId);
    if (existing) {
      throw DomainError.conflict(ErrorCode.QUIZ_ALREADY_EXISTS, 'Quiz already exists for this lesson.');
    }

    // Domain factory xử lý validation + tạo entity
    const quiz = Quiz.createNew(input);
    return this.quizRepo.create(quiz);
  }
}
