import { Inject, Injectable } from '@nestjs/common';
import { isValidObjectId } from 'mongoose';
import { Lesson } from '@/database/models';
import { BadRequestError, NotFoundError } from '../../../common/custom-error';
import { CreateQuizDto } from '../validators/quiz.validator';
import { IQuizRepository } from '../repositories/quiz.repository.interface';

@Injectable()
export class CreateQuizUseCase {
  constructor(
    @Inject('IQuizRepository')
    private readonly quizRepository: IQuizRepository,
  ) {}

  async execute(dto: CreateQuizDto) {
    if (!isValidObjectId(dto.lessonId)) {
      throw new BadRequestError('Invalid lesson id.');
    }

    const lesson = await Lesson.findById(dto.lessonId);
    if (!lesson) {
      throw new NotFoundError('Lesson not found.');
    }

    const existing = await this.quizRepository.findByLessonId(dto.lessonId);
    if (existing) {
      throw new BadRequestError('Quiz already exists for this lesson.');
    }

    return this.quizRepository.create(dto);
  }
}
