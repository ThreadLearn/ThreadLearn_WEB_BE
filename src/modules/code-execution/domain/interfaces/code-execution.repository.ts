import { CodeExecutionEntity } from '../entities/code-execution.entity';

export interface ICodeExecutionRepository {
  countFreeRunsToday(userId: string, since: Date): Promise<number>;
  create(execution: CodeExecutionEntity): Promise<unknown>;
  listHistory(userId: string, lessonId?: string): Promise<unknown[]>;
  findByUserAndId(userId: string, id: string): Promise<unknown | null>;
}

export const CODE_EXECUTION_REPOSITORY = Symbol('CODE_EXECUTION_REPOSITORY');
