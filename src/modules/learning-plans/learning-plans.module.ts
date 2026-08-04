import { Module } from '@nestjs/common';
import { LearningPlansController } from './learning-plans.controller';
import { CourseLearningGoalsService } from './course-learning-goals.service';
import { LearningPlanRemindersService } from './learning-plan-reminders.service';
import { LearningPlansService } from './learning-plans.service';
import { AdaptiveLearningService } from './adaptive-learning.service';
import { AdaptiveMasteryService } from './adaptive-mastery.service';
import { AdaptivePlanService } from './adaptive-plan.service';
import { AdaptivePlanRuleService } from './adaptive-plan-rule.service';
import { GeminiAdaptivePlanService } from './gemini-adaptive-plan.service';

@Module({
  controllers: [LearningPlansController],
  providers: [
    LearningPlansService,
    CourseLearningGoalsService,
    LearningPlanRemindersService,
    AdaptiveLearningService,
    AdaptiveMasteryService,
    AdaptivePlanService,
    AdaptivePlanRuleService,
    GeminiAdaptivePlanService,
  ],
})
export class LearningPlansModule {}
