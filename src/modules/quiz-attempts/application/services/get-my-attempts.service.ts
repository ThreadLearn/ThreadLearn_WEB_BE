import { Inject, Injectable } from '@nestjs/common';
import mongoose from 'mongoose';
import { BadRequestError } from '../../../../common/custom-error';
import { IQuizAttemptRepository } from '../../domain/interfaces/quiz-attempt.repository';

@Injectable()
export class GetMyAttemptsService {
  constructor(
    @Inject('IQuizAttemptRepository')
    private readonly quizAttemptRepository: IQuizAttemptRepository,
  ) {}

  async execute(userId: string) {
    if (!mongoose.isValidObjectId(userId)) {
      throw new BadRequestError('Invalid user ID.');
    }
    return this.quizAttemptRepository.findByUser(userId);
  }
}
