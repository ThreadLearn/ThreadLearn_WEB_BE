import { Injectable } from '@nestjs/common';
import mongoose from 'mongoose';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../common/custom-error';
import { CourseManagementActor, CourseManagementPolicy } from '../../course/application/policies/course-management.policy';
import { Course } from '../models/course.model';
import { Section } from '../models/section.model';

export interface SectionPayload {
  courseId: string;
  title: string;
  orderIndex?: number;
  description?: string;
  isPublished?: boolean;
}

@Injectable()
export class SectionsService {
  constructor(private readonly policy: CourseManagementPolicy) {}

  async listByCourse(actor: CourseManagementActor, courseId: string) {
    if (!mongoose.isValidObjectId(courseId)) throw new BadRequestError('Invalid course id.');

    const course = await Course.findById(courseId);
    if (!course || course.status === 'deleted') throw new NotFoundError('Course not found.');

    this.policy.assertCanReadCourseForManagement(actor, {
      id: course._id.toString(),
      instructorId: course.instructorId ? String(course.instructorId) : undefined,
      status: course.status,
      isDeleted: (course as any).isDeleted ?? (course.status as string) === 'deleted',
    });

    return Section.find({ courseId, status: { $ne: 'deleted' } }).sort({ orderIndex: 1 });
  }

  async create(actor: CourseManagementActor, data: SectionPayload) {
    if (!mongoose.isValidObjectId(data.courseId)) throw new BadRequestError('Invalid course id.');

    const course = await Course.findById(data.courseId);
    if (!course || course.status === 'deleted') throw new NotFoundError('Course not found.');

    this.policy.assertCanManageCourseStructure(actor, {
      id: course._id.toString(),
      instructorId: course.instructorId ? String(course.instructorId) : undefined,
      status: course.status,
      isDeleted: (course as any).isDeleted ?? (course.status as string) === 'deleted',
    });

    const order =
      typeof data.orderIndex === 'number'
        ? data.orderIndex
        : await Section.countDocuments({ courseId: data.courseId, status: { $ne: 'deleted' } });

    return Section.create({
      courseId: data.courseId,
      title: data.title,
      orderIndex: order,
      description: data.description,
      isPublished: data.isPublished ?? true,
    });
  }

  async update(actor: CourseManagementActor, id: string, data: Partial<SectionPayload>) {
    if (!mongoose.isValidObjectId(id)) throw new BadRequestError('Invalid section id.');

    const section = await Section.findOne({ _id: id, status: { $ne: 'deleted' } });
    if (!section) throw new NotFoundError('Section not found.');

    if (data.courseId && data.courseId !== section.courseId.toString()) {
      throw new BadRequestError('Cannot change courseId of existing section.');
    }

    const course = await Course.findById(section.courseId);
    if (!course || course.status === 'deleted') throw new NotFoundError('Course not found.');

    this.policy.assertCanManageCourseStructure(actor, {
      id: course._id.toString(),
      instructorId: course.instructorId ? String(course.instructorId) : undefined,
      status: course.status,
      isDeleted: (course as any).isDeleted ?? (course.status as string) === 'deleted',
    });

    if (data.title !== undefined) section.title = data.title;
    if (data.description !== undefined) section.description = data.description;
    if (typeof data.orderIndex === 'number') section.orderIndex = data.orderIndex;
    if (typeof data.isPublished === 'boolean') section.isPublished = data.isPublished;

    await section.save();
    return section;
  }

  async remove(actor: CourseManagementActor, id: string) {
    if (!mongoose.isValidObjectId(id)) throw new BadRequestError('Invalid section id.');

    const section = await Section.findOne({ _id: id, status: { $ne: 'deleted' } });
    if (!section) throw new NotFoundError('Section not found.');

    const course = await Course.findById(section.courseId);
    if (!course || course.status === 'deleted') throw new NotFoundError('Course not found.');

    this.policy.assertCanManageCourseStructure(actor, {
      id: course._id.toString(),
      instructorId: course.instructorId ? String(course.instructorId) : undefined,
      status: course.status,
      isDeleted: (course as any).isDeleted ?? (course.status as string) === 'deleted',
    });

    // Soft-delete Section: preserve sectionId on Lessons so Admin restore can recover the structure.
    section.status = 'deleted';
    section.deletedAt = new Date();
    section.isPublished = false;
    await section.save();

    return { id };
  }

  async restore(actor: CourseManagementActor, id: string) {
    if (!mongoose.isValidObjectId(id)) throw new BadRequestError('Invalid section id.');

    if (actor.role !== 'ADMIN') {
      throw new ForbiddenError('Only admins can restore deleted sections.');
    }

    const section = await Section.findOne({ _id: id, status: 'deleted' });
    if (!section) throw new NotFoundError('Deleted section not found.');

    const course = await Course.findById(section.courseId);
    if (!course || course.status === 'deleted') throw new NotFoundError('Course not found.');

    section.status = 'active';
    section.deletedAt = undefined as any;
    section.isPublished = true;
    await section.save();

    return section;
  }

  async reorder(actor: CourseManagementActor, courseId: string, ordered: { id: string; orderIndex: number }[]) {
    if (!mongoose.isValidObjectId(courseId)) throw new BadRequestError('Invalid course id.');

    const course = await Course.findById(courseId);
    if (!course || course.status === 'deleted') throw new NotFoundError('Course not found.');

    this.policy.assertCanManageCourseStructure(actor, {
      id: course._id.toString(),
      instructorId: course.instructorId ? String(course.instructorId) : undefined,
      status: course.status,
      isDeleted: (course as any).isDeleted ?? (course.status as string) === 'deleted',
    });

    const itemIds = ordered.map((item) => item.id);

    // 1. Check for duplicate IDs
    if (new Set(itemIds).size !== itemIds.length) {
      throw new BadRequestError('Duplicate section IDs in reorder list.');
    }

    // 2. Validate object IDs
    if (itemIds.some((id) => !mongoose.isValidObjectId(id))) {
      throw new BadRequestError('Invalid section id in reorder list.');
    }

    // 3. Load sections from DB
    const sections = await Section.find({ _id: { $in: itemIds } });
    if (sections.length !== itemIds.length) {
      throw new NotFoundError('One or more sections in reorder list do not exist.');
    }

    // 4. Reject soft-deleted sections
    if (sections.some((s) => s.status === 'deleted')) {
      throw new BadRequestError('Cannot reorder soft-deleted section.');
    }

    // 5. Reject sections from another course
    if (sections.some((s) => s.courseId.toString() !== courseId)) {
      throw new BadRequestError('Reorder list contains sections belonging to another course.');
    }

    // 6. Bulk atomic update
    const bulkOps = ordered.map((item) => ({
      updateOne: {
        filter: { _id: item.id, courseId, status: { $ne: 'deleted' } },
        update: { $set: { orderIndex: item.orderIndex } },
      },
    }));

    if (bulkOps.length > 0) {
      await Section.bulkWrite(bulkOps);
    }

    return this.listByCourse(actor, courseId);
  }
}
