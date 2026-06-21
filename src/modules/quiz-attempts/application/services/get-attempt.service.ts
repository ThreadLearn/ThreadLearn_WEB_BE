import { Inject, Injectable } from '@nestjs/common';
import mongoose from 'mongoose';
import { BadRequestError, NotFoundError } from '../../../../common/custom-error';
import { IQuizAttemptRepository } from '../../domain/ports/quiz-attempt.repository.interface';

/**
 * UC42: View Quiz Result (Student)
 * Service to fetch detail of a specific quiz attempt by a student.
 */
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
