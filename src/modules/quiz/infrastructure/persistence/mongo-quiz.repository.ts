import { Injectable } from '@nestjs/common';
import { Quiz as QuizModel } from './schemas/quiz.schema';
import { Quiz } from '../../domain/entities/quiz.entity';
import { IQuizRepository } from '../../domain/interfaces/quiz.repository';
import { QuizMapper } from '../mapper/quiz.mapper';

@Injectable()
export class MongoQuizRepository implements IQuizRepository {
  async findById(id: string): Promise<Quiz | null> {
    const doc = await QuizModel.findById(id).exec();
    return doc ? QuizMapper.toEntity(doc) : null;
  }

  async findByLessonId(lessonId: string): Promise<Quiz | null> {
    const doc = await QuizModel.findOne({ lessonId }).exec();
    return doc ? QuizMapper.toEntity(doc) : null;
  }

  async findAll(): Promise<Quiz[]> {
    const docs = await QuizModel.find().exec();
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

  async delete(id: string): Promise<Quiz | null> {
    const doc = await QuizModel.findByIdAndDelete(id).exec();
    return doc ? QuizMapper.toEntity(doc) : null;
  }
}
