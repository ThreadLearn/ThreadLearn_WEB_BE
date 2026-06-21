import { Injectable } from '@nestjs/common';
import { EnrollmentsService } from '../../services/enrollments.service';

@Injectable()
export class GetMyResumeService {
  async execute(userId: string) {
    return EnrollmentsService.getMyResume(userId);
  }
}
