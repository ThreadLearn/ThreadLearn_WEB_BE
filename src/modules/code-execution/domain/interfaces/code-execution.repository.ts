import { CodeExecutionEntity } from '../entities/code-execution.entity';

export interface ICodeExecutionRepository {
  countFreeRunsToday(userId: string, since: Date): Promise<number>;
  create(execution: CodeExecutionEntity): Promise<unknown>;
  listHistory(userId: string, options: CodeExecutionHistoryOptions): Promise<CodeExecutionHistoryPage>;
  findByUserAndId(userId: string, id: string): Promise<unknown | null>;
}

export interface CodeExecutionHistoryOptions {
  lessonId?: string;
  exerciseId?: string;
  page: number;
  limit: number;
}

export interface CodeExecutionHistoryPage {
  items: unknown[];
  total: number;
}

export const CODE_EXECUTION_REPOSITORY = Symbol('CODE_EXECUTION_REPOSITORY');
