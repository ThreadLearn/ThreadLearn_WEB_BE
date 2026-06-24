import { Inject, Injectable } from '@nestjs/common';
import {
  ENROLLMENT_REPOSITORY,
  IEnrollmentRepository,
} from '../../domain/interfaces/enrollment.repository';

@Injectable()
export class ListMyEnrollmentsService {
  constructor(@Inject(ENROLLMENT_REPOSITORY) private readonly enrollments: IEnrollmentRepository) {}

  async execute(userId: string) {
    return this.enrollments.listByUser(userId);
  }
}
