import { Injectable } from '@nestjs/common';
import { CodeExecutionEntity } from '../../domain/entities/code-execution.entity';
import { ICodeExecutionRepository } from '../../domain/interfaces/code-execution.repository';
import { CodeExecution } from '../../models/code-execution.model';
import { CodeExecutionMapper } from '../mapper/code-execution.mapper';

@Injectable()
export class MongoCodeExecutionRepository implements ICodeExecutionRepository {
  async countFreeRunsToday(userId: string, since: Date): Promise<number> {
    return CodeExecution.countDocuments({
      userId,
      createdAt: { $gte: since },
      exerciseId: { $in: [null, undefined] },
    });
  }

  async create(execution: CodeExecutionEntity): Promise<unknown> {
    return CodeExecution.create(CodeExecutionMapper.toPersistence(execution));
  }

  async listHistory(userId: string, lessonId?: string): Promise<unknown[]> {
    return CodeExecution.find({ userId, ...(lessonId ? { lessonId } : {}) }).sort({ createdAt: -1 }).limit(50);
  }

  async findByUserAndId(userId: string, id: string): Promise<unknown | null> {
    return CodeExecution.findOne({ _id: id, userId });
  }
}
