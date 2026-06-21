import { Inject, Injectable } from '@nestjs/common';
import { isValidObjectId } from 'mongoose';
import { BadRequestError, NotFoundError } from '../../../common/custom-error';
import { QuestionDto } from '../validators/quiz.validator';
import { IQuizRepository } from '../repositories/quiz.repository.interface';

@Injectable()
export class AddQuestionUseCase {
  constructor(
    @Inject('IQuizRepository')
    private readonly quizRepository: IQuizRepository,
  ) {}

  async execute(quizId: string, question: QuestionDto) {
    if (!isValidObjectId(quizId)) {
      throw new BadRequestError('Invalid quiz id.');
    }

    const quiz = await this.quizRepository.findById(quizId);
    if (!quiz) {
      throw new NotFoundError('Quiz not found.');
    }

    return this.quizRepository.addQuestion(quizId, question);
  }
}
