import { Module } from '@nestjs/common';
import { EnrollmentsController } from './controllers/enrollments.controller';
import { EnrollmentsService } from './services/enrollments.service';

@Module({
  controllers: [EnrollmentsController],
  providers: [EnrollmentsService],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
