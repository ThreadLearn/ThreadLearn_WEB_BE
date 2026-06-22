import { Injectable } from '@nestjs/common';
import mongoose from 'mongoose';
import { EnrollmentEntity } from '../../domain/entities/enrollment.entity';
import {
  EnrollmentView,
  IEnrollmentRepository,
} from '../../domain/interfaces/enrollment.repository';
import { Enrollment } from '../../models/enrollment.model';
import { EnrollmentMapper } from '../mapper/enrollment.mapper';

@Injectable()
export class MongoEnrollmentRepository implements IEnrollmentRepository {
  async findByUserAndCourse(userId: string, courseId: string): Promise<EnrollmentEntity | null> {
    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(courseId)) return null;
    const doc = await Enrollment.findOne({ userId, courseId });
    return doc ? EnrollmentMapper.toEntity(doc) : null;
  }

  async findById(id: string): Promise<EnrollmentEntity | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await Enrollment.findById(id);
    return doc ? EnrollmentMapper.toEntity(doc) : null;
  }

  async listByUser(userId: string): Promise<EnrollmentView[]> {
    if (!mongoose.isValidObjectId(userId)) return [];
    const docs = await Enrollment.find({ userId })
      .populate('courseId', 'title slug thumbnailUrl level language status isPremium totalLessons')
      .sort({ updatedAt: -1 });
    return docs.filter((doc) => doc.courseId).map((doc) => EnrollmentMapper.toView(doc));
  }

  async findActiveResume(userId: string): Promise<EnrollmentView | null> {
    if (!mongoose.isValidObjectId(userId)) return null;
    const doc = await Enrollment.findOne({ userId, completed: false })
      .sort({ lastAccessedAt: -1, updatedAt: -1 })
      .populate('courseId', 'title slug thumbnailUrl level language status isPremium totalLessons')
      .lean();
    return doc ? EnrollmentMapper.toView(doc) : null;
  }

  async create(enrollment: EnrollmentEntity): Promise<EnrollmentEntity> {
    const doc = await Enrollment.create(EnrollmentMapper.toPersistence(enrollment));
    return EnrollmentMapper.toEntity(doc);
  }

  async update(enrollment: EnrollmentEntity): Promise<EnrollmentEntity> {
    const doc = await Enrollment.findByIdAndUpdate(
      enrollment.id,
      EnrollmentMapper.toPersistence(enrollment),
      { new: true },
    );
    return doc ? EnrollmentMapper.toEntity(doc) : enrollment;
  }
}
