import { Injectable } from '@nestjs/common';
import { Course } from '../../../courses/models/course.model';
import { Lesson } from '../../../lessons/models/lesson.model';
import { Section } from '../../../courses/models/section.model';
import {
  CourseContentSnapshot,
  ICourseContentPort,
} from '../../domain/interfaces/course-content.port';

/**
 * Adapter cross-aggregate: đây là nơi DUY NHẤT của module course được phép
 * chạm model Lesson/Section. Nhờ port, domain/application vẫn không biết Mongoose.
 */
@Injectable()
export class MongoCourseContentAdapter implements ICourseContentPort {
  async getContent(courseId: string): Promise<CourseContentSnapshot> {
    const [sections, lessons] = await Promise.all([
      Section.find({ courseId }).sort({ orderIndex: 1 }),
      Lesson.find({ courseId, status: { $ne: 'deleted' } })
        .sort({ orderIndex: 1 })
        .select('-contentMarkdown -content'),
    ]);
    return { sections, lessons };
  }

  async countActiveLessons(courseId: string): Promise<number> {
    return Lesson.countDocuments({ courseId, status: 'active' });
  }

  async refreshLessonCount(courseId: string): Promise<number> {
    const total = await Lesson.countDocuments({ courseId, status: 'active' });
    await Course.findByIdAndUpdate(courseId, { totalLessons: total });
    return total;
  }
}
