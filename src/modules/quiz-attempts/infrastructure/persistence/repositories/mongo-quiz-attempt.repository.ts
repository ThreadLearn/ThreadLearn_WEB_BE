import { Injectable } from '@nestjs/common';
import { QuizAttempt as QuizAttemptModel } from '../schemas/quiz-attempt.schema';
import { QuizAttempt } from '../../../domain/entities/quiz-attempt.entity';
import { IQuizAttemptRepository } from '../../../domain/interfaces/quiz-attempt.repository';
import { QuizAttemptMapper } from '../../mapper/quiz-attempt.mapper';

@Injectable()
export class QuizAttemptRepository implements IQuizAttemptRepository {
  async create(entity: QuizAttempt): Promise<QuizAttempt> {
    const data = QuizAttemptMapper.toPersistence(entity);
    const doc = await QuizAttemptModel.create(data);
    return QuizAttemptMapper.toEntity(doc);
  }

  async findByIdAndUser(attemptId: string, userId: string): Promise<QuizAttempt | null> {
    const doc = await QuizAttemptModel.findOne({ _id: attemptId, userId }).exec();
    return doc ? QuizAttemptMapper.toEntity(doc) : null;
  }

  async findByUser(userId: string): Promise<QuizAttempt[]> {
    const docs = await QuizAttemptModel.find({ userId }).sort({ completedAt: -1 }).exec();
    return docs.map(QuizAttemptMapper.toEntity);
  }

  async deleteById(attemptId: string): Promise<void> {
    await QuizAttemptModel.findByIdAndDelete(attemptId).exec();
  }
}
