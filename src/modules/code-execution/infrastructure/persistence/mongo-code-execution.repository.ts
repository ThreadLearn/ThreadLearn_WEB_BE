import { Injectable } from '@nestjs/common';
import mongoose from 'mongoose';
import { CodeExecutionEntity } from '../../domain/entities/code-execution.entity';
import { CodeExecutionHistoryOptions, ICodeExecutionRepository } from '../../domain/interfaces/code-execution.repository';
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

  async listHistory(userId: string, { lessonId, exerciseId, page, limit }: CodeExecutionHistoryOptions) {
    const filter = { userId, ...(lessonId ? { lessonId } : {}), ...(exerciseId ? { exerciseId } : {}) };
    const [items, total] = await Promise.all([
      CodeExecution.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      CodeExecution.countDocuments(filter),
    ]);
    return { items, total };
  }

  async findByUserAndId(userId: string, id: string): Promise<unknown | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    return CodeExecution.findOne({ _id: id, userId });
  }
}
