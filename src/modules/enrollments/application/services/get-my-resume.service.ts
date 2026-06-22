import { Inject, Injectable } from '@nestjs/common';
import {
  ENROLLMENT_REPOSITORY,
  IEnrollmentRepository,
} from '../../domain/interfaces/enrollment.repository';

@Injectable()
export class GetMyResumeService {
  constructor(@Inject(ENROLLMENT_REPOSITORY) private readonly enrollments: IEnrollmentRepository) {}

  async execute(userId: string) {
    return this.enrollments.findActiveResume(userId);
  }
}
