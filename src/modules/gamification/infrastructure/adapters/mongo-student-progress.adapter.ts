import { Injectable } from '@nestjs/common';
import { IStudentProgressPort } from '../../domain/interfaces/student-progress.port';
// CHÚ Ý: Đây là nơi DUY NHẤT trong module gamification được phép import Enrollment
import { Enrollment } from '../../../enrollments/models/enrollment.model';

@Injectable()
export class MongoStudentProgressAdapter implements IStudentProgressPort {
  async getCompletedLessonsCount(userId: string): Promise<number> {
    const enrollments = await Enrollment.find({ userId })
      .select('completedLessons')
      .lean();
    
    const completedLessonIds = new Set(
      enrollments.flatMap((enrollment) =>
        (enrollment.completedLessons ?? []).map((lessonId) => lessonId.toString())
      )
    );
    
    return completedLessonIds.size;
  }

  async getCompletedCoursesCount(userId: string): Promise<number> {
    const completedCoursesCount = await Enrollment.countDocuments({
      userId,
      completed: true,
    });
    return completedCoursesCount;
  }
}
