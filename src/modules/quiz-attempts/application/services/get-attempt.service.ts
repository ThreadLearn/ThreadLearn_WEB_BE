import { Inject, Injectable } from '@nestjs/common';
import mongoose from 'mongoose';
import { BadRequestError, NotFoundError } from '../../../../common/custom-error';
import { IQuizAttemptRepository } from '../../domain/interfaces/quiz-attempt.repository';

@Injectable()
export class GetAttemptService {
  constructor(
    @Inject('IQuizAttemptRepository')
    private readonly quizAttemptRepository: IQuizAttemptRepository,
  ) {}

  async execute(userId: string, attemptId: string) {
    if (!mongoose.isValidObjectId(userId)) {
      throw new BadRequestError('Invalid user ID.');
    }
    if (!mongoose.isValidObjectId(attemptId)) {
      throw new BadRequestError('Invalid attempt ID.');
    }
    const attempt = await this.quizAttemptRepository.findByIdAndUser(attemptId, userId);
    if (!attempt) {
      throw new NotFoundError('Quiz attempt not found.');
    }
    return attempt;
  }
}
