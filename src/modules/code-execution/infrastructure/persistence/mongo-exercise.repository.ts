import { Injectable } from '@nestjs/common';
import mongoose from 'mongoose';
import { BadRequestError } from '../../../../common/custom-error';
import { ExerciseEntity } from '../../domain/entities/exercise.entity';
import { IExerciseRepository } from '../../domain/interfaces/exercise.repository';
import { Exercise } from '../../models/exercise.model';
import { ExerciseMapper } from '../mapper/exercise.mapper';

@Injectable()
export class MongoExerciseRepository implements IExerciseRepository {
  async listByLesson(lessonId: string): Promise<unknown[]> {
    if (!mongoose.isValidObjectId(lessonId)) throw new BadRequestError('Invalid lesson id.');
    return Exercise.find({ lessonId }).sort({ createdAt: 1 });
  }

  async findById(id: string): Promise<ExerciseEntity | null> {
    if (!mongoose.isValidObjectId(id)) throw new BadRequestError('Invalid exercise id.');
    const doc = await Exercise.findById(id);
    return doc ? ExerciseMapper.toEntity(doc) : null;
  }

  async findViewById(id: string): Promise<any | null> {
    if (!mongoose.isValidObjectId(id)) throw new BadRequestError('Invalid exercise id.');
    return Exercise.findById(id);
  }

  async create(exercise: ExerciseEntity): Promise<unknown> {
    return Exercise.create(ExerciseMapper.toPersistence(exercise));
  }

  async update(exercise: ExerciseEntity): Promise<unknown> {
    return Exercise.findByIdAndUpdate(exercise.id, ExerciseMapper.toPersistence(exercise), { new: true });
  }

  async remove(id: string): Promise<void> {
    if (!mongoose.isValidObjectId(id)) throw new BadRequestError('Invalid exercise id.');
    await Exercise.findByIdAndDelete(id);
  }
}
