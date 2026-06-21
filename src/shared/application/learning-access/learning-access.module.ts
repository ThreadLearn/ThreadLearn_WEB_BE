import { Module } from '@nestjs/common';
import { LEARNING_ACCESS } from '../../domain/interfaces/learning-access.port';
import { LearningAccessService } from './learning-access.service';

@Module({
  providers: [
    LearningAccessService,
    { provide: LEARNING_ACCESS, useExisting: LearningAccessService },
  ],
  exports: [LearningAccessService, LEARNING_ACCESS],
})
export class LearningAccessModule {}
