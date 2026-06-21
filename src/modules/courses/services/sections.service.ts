import mongoose from 'mongoose';
import { Section } from '../models/section.model';
import { Course } from '../models/course.model';
import { Lesson } from '../../lessons/models/lesson.model';
import { BadRequestError, NotFoundError } from '../../../common/custom-error';

export interface SectionPayload {
  courseId: string;
  title: string;
  orderIndex?: number;
  description?: string;
  isPublished?: boolean;
}

export class SectionsService {
  static async listByCourse(courseId: string) {
    if (!mongoose.isValidObjectId(courseId)) throw new BadRequestError('Invalid course id.');
    return Section.find({ courseId }).sort({ orderIndex: 1 });
  }

  static async create(data: SectionPayload) {
    if (!mongoose.isValidObjectId(data.courseId)) throw new BadRequestError('Invalid course id.');
    const course = await Course.findById(data.courseId);
    if (!course) throw new NotFoundError('Course not found.');

    const order =
      typeof data.orderIndex === 'number'
        ? data.orderIndex
        : (await Section.countDocuments({ courseId: data.courseId }));
    return Section.create({
      courseId: data.courseId,
      title: data.title,
      orderIndex: order,
      description: data.description,
      isPublished: data.isPublished ?? true,
    });
  }

  static async update(id: string, data: Partial<SectionPayload>) {
    if (!mongoose.isValidObjectId(id)) throw new BadRequestError('Invalid section id.');
    const section = await Section.findById(id);
    if (!section) throw new NotFoundError('Section not found.');
    if (data.title !== undefined) section.title = data.title;
    if (data.description !== undefined) section.description = data.description;
    if (typeof data.orderIndex === 'number') section.orderIndex = data.orderIndex;
    if (typeof data.isPublished === 'boolean') section.isPublished = data.isPublished;
    await section.save();
    return section;
  }

  static async remove(id: string) {
    if (!mongoose.isValidObjectId(id)) throw new BadRequestError('Invalid section id.');
    const section = await Section.findById(id);
    if (!section) throw new NotFoundError('Section not found.');
    await Lesson.updateMany({ sectionId: id }, { $unset: { sectionId: '' } });
    await section.deleteOne();
    return { id };
  }

  static async reorder(courseId: string, ordered: { id: string; orderIndex: number }[]) {
    if (!mongoose.isValidObjectId(courseId)) throw new BadRequestError('Invalid course id.');
    await Promise.all(
      ordered
        .filter((item) => mongoose.isValidObjectId(item.id))
        .map((item) => Section.updateOne({ _id: item.id, courseId }, { orderIndex: item.orderIndex }))
    );
    return SectionsService.listByCourse(courseId);
  }
}
export default SectionsService;
