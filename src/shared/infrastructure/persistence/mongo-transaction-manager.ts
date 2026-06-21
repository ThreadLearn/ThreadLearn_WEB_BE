import { Injectable } from '@nestjs/common';
import mongoose from 'mongoose';

export interface ITransactionManager {
  startTransaction(): Promise<any>;
  commitTransaction(session: any): Promise<void>;
  abortTransaction(session: any): Promise<void>;
  runInTransaction<T>(work: (session: any) => Promise<T>): Promise<T>;
}

@Injectable()
export class MongoTransactionManager implements ITransactionManager {
  async startTransaction(): Promise<mongoose.ClientSession> {
    const session = await mongoose.startSession();
    session.startTransaction();
    return session;
  }

  async commitTransaction(session: mongoose.ClientSession): Promise<void> {
    await session.commitTransaction();
    await session.endSession();
  }

  async abortTransaction(session: mongoose.ClientSession): Promise<void> {
    await session.abortTransaction();
    await session.endSession();
  }

  async runInTransaction<T>(work: (session: mongoose.ClientSession) => Promise<T>): Promise<T> {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const result = await work(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }
}
