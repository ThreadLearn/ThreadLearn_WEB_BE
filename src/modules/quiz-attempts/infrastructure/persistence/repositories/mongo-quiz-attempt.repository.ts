import { Injectable } from '@nestjs/common';
import { IQuizAttempt, QuizAttempt } from '../../../models/quiz-attempt.model';
import { IQuizAttemptRepository } from '../../../domain/ports/quiz-attempt.repository.interface';

@Injectable()
export class QuizAttemptRepository implements IQuizAttemptRepository {
  async create(data: Partial<IQuizAttempt>): Promise<IQuizAttempt> {
    return QuizAttempt.create(data);
  }

  async findByIdAndUser(attemptId: string, userId: string): Promise<IQuizAttempt | null> {
    return QuizAttempt.findOne({ _id: attemptId, userId })
      .populate('quizId') as any;
  }

  async findByUser(userId: string): Promise<IQuizAttempt[]> {
    return QuizAttempt.find({ userId })
      .sort({ createdAt: -1 })
      .populate('quizId', 'title description totalQuestions xpReward timeLimit passingScore') as any;
  }

  async deleteById(attemptId: string): Promise<void> {
    await QuizAttempt.deleteOne({ _id: attemptId });
  }
}
