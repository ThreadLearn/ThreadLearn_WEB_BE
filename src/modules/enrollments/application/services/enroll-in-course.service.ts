import { Injectable } from '@nestjs/common';
import { EnrollmentsService } from '../../services/enrollments.service';

@Injectable()
export class EnrollInCourseService {
  async execute(userId: string, courseId: string) {
    return EnrollmentsService.enrollInCourse(userId, courseId);
  }
}
