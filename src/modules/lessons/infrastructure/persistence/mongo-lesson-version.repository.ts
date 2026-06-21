import { Injectable } from '@nestjs/common';
import mongoose from 'mongoose';
import { LessonVersionEntity } from '../../domain/entities/lesson-version.entity';
import { ILessonVersionRepository } from '../../domain/interfaces/lesson-version.repository';
import { LessonVersion } from '../../models/lesson-version.model';
import { LessonVersionMapper } from '../mapper/lesson-version.mapper';

@Injectable()
export class MongoLessonVersionRepository implements ILessonVersionRepository {
  async latestVersionNumber(lessonId: string): Promise<number> {
    if (!mongoose.isValidObjectId(lessonId)) return 0;
    const last = await LessonVersion.findOne({ lessonId }).sort({ version: -1 }).select('version');
    return last?.version ?? 0;
  }

  async listByLesson(lessonId: string): Promise<LessonVersionEntity[]> {
    const docs = await LessonVersion.find({ lessonId }).sort({ version: -1 });
    return docs.map((d) => LessonVersionMapper.toEntity(d));
  }

  async create(version: LessonVersionEntity): Promise<LessonVersionEntity> {
    const doc = await LessonVersion.create(LessonVersionMapper.toPersistence(version));
    return LessonVersionMapper.toEntity(doc);
  }
}
