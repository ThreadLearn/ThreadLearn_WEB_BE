import { Module } from '@nestjs/common';
import { LearningPlansController } from './learning-plans.controller';
import { CourseLearningGoalsService } from './course-learning-goals.service';
import { LearningPlansService } from './learning-plans.service';

@Module({
  controllers: [LearningPlansController],
  providers: [LearningPlansService, CourseLearningGoalsService],
})
export class LearningPlansModule {}
