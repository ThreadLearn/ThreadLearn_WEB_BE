import { Injectable } from '@nestjs/common';
import { EnrollmentsService } from '../../services/enrollments.service';

@Injectable()
export class ListMyEnrollmentsService {
  async execute(userId: string) {
    return EnrollmentsService.listMyEnrollments(userId);
  }
}
