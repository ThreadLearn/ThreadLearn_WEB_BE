import { Module } from '@nestjs/common';
import { LearningPlansController } from './learning-plans.controller';
import { CourseLearningGoalsService } from './course-learning-goals.service';
import { LearningPlanRemindersService } from './learning-plan-reminders.service';
import { LearningPlansService } from './learning-plans.service';

@Module({
  controllers: [LearningPlansController],
  providers: [LearningPlansService, CourseLearningGoalsService, LearningPlanRemindersService],
})
export class LearningPlansModule {}
