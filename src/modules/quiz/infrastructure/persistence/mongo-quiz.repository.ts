import { Injectable } from '@nestjs/common';
import mongoose from 'mongoose';
import { Quiz as QuizModel } from './schemas/quiz.schema';
import { Quiz } from '../../domain/entities/quiz.entity';
import { IQuizRepository } from '../../domain/interfaces/quiz.repository';
import { QuizMapper } from '../mapper/quiz.mapper';

@Injectable()
export class MongoQuizRepository implements IQuizRepository {
  private readonly activeFilter = { isDeleted: { $ne: true } };

  async findById(id: string): Promise<Quiz | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await QuizModel.findOne({ _id: id, ...this.activeFilter }).exec();
    return doc ? QuizMapper.toEntity(doc) : null;
  }

  async findByLessonId(lessonId: string): Promise<Quiz | null> {
    if (!mongoose.isValidObjectId(lessonId)) return null;
    const doc = await QuizModel.findOne({ lessonId, ...this.activeFilter }).exec();
    return doc ? QuizMapper.toEntity(doc) : null;
  }

  async findAll(): Promise<Quiz[]> {
    const docs = await QuizModel.find(this.activeFilter).exec();
    return docs.map(QuizMapper.toEntity);
  }

  async findByLessonIds(lessonIds: string[]): Promise<Quiz[]> {
    if (!lessonIds.length) return [];
    const docs = await QuizModel.find({ lessonId: { $in: lessonIds }, ...this.activeFilter }).exec();
    return docs.map(QuizMapper.toEntity);
  }

  async create(entity: Quiz): Promise<Quiz> {
    const data = QuizMapper.toPersistence(entity);
    const doc = await QuizModel.create(data);
    return QuizMapper.toEntity(doc);
  }

  async update(entity: Quiz): Promise<Quiz> {
    const data = QuizMapper.toPersistence(entity);
    const doc = await QuizModel.findByIdAndUpdate(entity.id, data, {
      new: true,
      runValidators: true,
    }).exec();
    if (!doc) {
      throw new Error(`Quiz ${entity.id} not found for update`);
    }
    return QuizMapper.toEntity(doc);
  }
}
