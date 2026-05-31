import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ILesson } from '../models/lesson.model';
import { NotFoundError } from '../../../common/custom-error';

@Injectable()
export class LessonsService {
  constructor(@InjectModel('Lesson') private lessonModel: Model<ILesson>) {}

  async getLesson(lessonId: string) {
    const lesson = await this.lessonModel.findById(lessonId);
    if (!lesson) throw new NotFoundError('Lesson not found.');
    return lesson;
  }

  async createLesson(data: any) {
    return this.lessonModel.create({
      courseId:      data.courseId,
      title:         data.title,
      content:       data.content,
      attachmentUrl: data.attachmentUrl,
      order:         data.order ?? 0,
    });
  }

  async updateAttachment(lessonId: string, attachmentUrl: string) {
    const lesson = await this.lessonModel.findByIdAndUpdate(
      lessonId, { attachmentUrl }, { new: true },
    );
    if (!lesson) throw new NotFoundError('Lesson not found.');
    return lesson;
  }
}
