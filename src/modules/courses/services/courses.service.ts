import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ICourse } from '../models/course.model';
import { ILesson } from '../../lessons/models/lesson.model';
import { NotFoundError } from '../../../common/custom-error';

@Injectable()
export class CoursesService {
  constructor(
    @InjectModel('Course') private courseModel: Model<ICourse>,
    @InjectModel('Lesson') private lessonModel: Model<ILesson>,
  ) {}

  async listCourses(page = 1, limit = 10, search = '') {
    const skip  = (page - 1) * limit;
    const query: any = { isPublished: true };
    if (search) query.$text = { $search: search };

    const [courses, total] = await Promise.all([
      this.courseModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .sort(search ? { score: { $meta: 'textScore' } } : { createdAt: -1 }),
      this.courseModel.countDocuments(query),
    ]);

    return { courses, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getCourseDetail(courseId: string) {
    const course = await this.courseModel.findById(courseId);
    if (!course) throw new NotFoundError('Course not found.');

    const lessons = await this.lessonModel
      .find({ courseId }).sort({ order: 1 }).select('-content');

    return { course, lessons };
  }

  async createCourse(data: any) {
    return this.courseModel.create({
      title:       data.title,
      description: data.description,
      coverImage:  data.coverImage,
      isPublished: data.isPublished ?? false,
    });
  }
}
