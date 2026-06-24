import { Module } from '@nestjs/common';
import { LEARNING_ACCESS_DATA } from '../../domain/interfaces/learning-access-data.port';
import { LEARNING_ACCESS } from '../../domain/interfaces/learning-access.port';
import { MongoLearningAccessDataAdapter } from '../../infrastructure/persistence/mongo-learning-access-data.adapter';
import { LearningAccessService } from './learning-access.service';

@Module({
  providers: [
    MongoLearningAccessDataAdapter,
    LearningAccessService,
    { provide: LEARNING_ACCESS_DATA, useExisting: MongoLearningAccessDataAdapter },
    { provide: LEARNING_ACCESS, useExisting: LearningAccessService },
  ],
  exports: [LearningAccessService, LEARNING_ACCESS, LEARNING_ACCESS_DATA],
})
export class LearningAccessModule {}
