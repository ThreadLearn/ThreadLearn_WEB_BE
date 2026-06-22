import { Inject, Injectable } from '@nestjs/common';
import {
  ENROLLMENT_REPOSITORY,
  IEnrollmentRepository,
} from '../../domain/interfaces/enrollment.repository';

@Injectable()
export class GetMyCourseEnrollmentService {
  constructor(@Inject(ENROLLMENT_REPOSITORY) private readonly enrollments: IEnrollmentRepository) {}

  async execute(userId: string, courseId: string) {
    return this.enrollments.findByUserAndCourse(userId, courseId);
  }
}
