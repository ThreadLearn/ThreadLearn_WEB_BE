import { Injectable } from '@nestjs/common';
import { EnrollmentsService } from '../../services/enrollments.service';

@Injectable()
export class GetMyCourseEnrollmentService {
  async execute(userId: string, courseId: string) {
    return EnrollmentsService.getMyCourseEnrollment(userId, courseId);
  }
}
