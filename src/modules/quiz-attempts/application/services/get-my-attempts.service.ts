import { Inject, Injectable } from '@nestjs/common';
import mongoose from 'mongoose';
import { BadRequestError } from '../../../../common/custom-error';
import { IQuizAttemptRepository } from '../../domain/ports/quiz-attempt.repository.interface';

/**
 * UC43: View Quiz Attempt History (Student)
 * Service to fetch all quiz attempts completed by a specific student.
 */
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
