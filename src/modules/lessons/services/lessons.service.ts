import { Lesson } from '../models/lesson.model';
import { NotFoundError } from '../../../common/custom-error';

export class LessonsService {
  static async getLesson(lessonId: string) {
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      throw new NotFoundError('Lesson not found.');
    }
    return lesson;
  }

  static async createLesson(data: any) {
    return await Lesson.create({
      courseId: data.courseId,
      title: data.title,
      content: data.content,
      attachmentUrl: data.attachmentUrl,
      order: data.order || 0,
    });
  }

  static async updateAttachment(lessonId: string, attachmentUrl: string) {
    const lesson = await Lesson.findByIdAndUpdate(lessonId, { attachmentUrl }, { new: true });
    if (!lesson) {
      throw new NotFoundError('Lesson not found.');
    }
    return lesson;
  }
}
export default LessonsService;
