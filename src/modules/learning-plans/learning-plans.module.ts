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
import { AdaptiveGoalPolicyService } from './adaptive-goal-policy.service';
import { GeminiDiagnosticQuestionService } from './gemini-diagnostic-question.service';

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
    AdaptiveGoalPolicyService,
    GeminiDiagnosticQuestionService,
    GeminiAdaptivePlanService,
  ],
})
export class LearningPlansModule {}
