import { Injectable } from '@nestjs/common';
import mongoose from 'mongoose';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import { LessonEntity } from '../../domain/entities/lesson.entity';
import { ILessonRepository } from '../../domain/interfaces/lesson.repository';
import { Lesson } from '../../models/lesson.model';
import { LessonMapper } from '../mapper/lesson.mapper';

/** Adapter: hiện thực ILessonRepository bằng Mongoose model `Lesson`. */
@Injectable()
export class MongoLessonRepository implements ILessonRepository {
  async findById(id: string): Promise<LessonEntity | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await Lesson.findById(id);
    return doc ? LessonMapper.toEntity(doc) : null;
  }

  async listByCourse(courseId: string): Promise<LessonEntity[]> {
    const docs = await Lesson.find({ courseId, status: { $ne: 'deleted' } })
      .sort({ orderIndex: 1 })
      .select('-contentMarkdown -content');
    return docs.map((d) => LessonMapper.toEntity(d));
  }

  async countNonDeleted(courseId: string): Promise<number> {
    return Lesson.countDocuments({ courseId, status: { $ne: 'deleted' } });
  }

  async create(lesson: LessonEntity): Promise<LessonEntity> {
    const doc = await Lesson.create(LessonMapper.toPersistence(lesson));
    return LessonMapper.toEntity(doc);
  }

  async update(lesson: LessonEntity): Promise<LessonEntity> {
    const doc = await Lesson.findByIdAndUpdate(lesson.id, LessonMapper.toPersistence(lesson), {
      new: true,
    });
    if (!doc) throw DomainError.notFound(ErrorCode.LESSON_NOT_FOUND, 'Lesson not found.');
    return LessonMapper.toEntity(doc);
  }
}
