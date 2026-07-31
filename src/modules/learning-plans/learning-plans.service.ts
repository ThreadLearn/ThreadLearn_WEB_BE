import { Injectable } from '@nestjs/common';
import { UpdateLearningPlanDto } from './learning-plan.dto';
import { ILearningPlan, LearningPlan } from './models/learning-plan.model';

const DEFAULT_PLAN = {
  weeklyHours: 3,
  preferredDays: [1, 3, 5],
  reminderEnabled: true,
  reminderTime: '19:00',
  timezone: 'Asia/Ho_Chi_Minh',
};

@Injectable()
export class LearningPlansService {
  async getMine(userId: string) {
    return this.toResponse(await LearningPlan.findOne({ userId }));
  }

  async updateMine(userId: string, input: UpdateLearningPlanDto) {
    const targetDate = input.targetDate ? new Date(`${input.targetDate}T23:59:59.999Z`) : undefined;
    const plan = await LearningPlan.findOneAndUpdate(
      { userId },
      {
        $set: {
          ...input,
          preferredDays: [...input.preferredDays].sort((a, b) => a - b),
          ...(input.targetDate !== undefined ? { targetDate } : {}),
        },
        $setOnInsert: { userId },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    return this.toResponse(plan);
  }

  private toResponse(plan: ILearningPlan | null) {
    const source = plan ?? DEFAULT_PLAN;
    const activeDays = source.preferredDays.length;
    return {
      weeklyHours: source.weeklyHours,
      preferredDays: source.preferredDays,
      targetDate: plan?.targetDate?.toISOString() ?? null,
      reminderEnabled: source.reminderEnabled,
      reminderTime: source.reminderTime,
      timezone: source.timezone,
      isConfigured: Boolean(plan),
      suggestedSessionMinutes: Math.max(15, Math.round((source.weeklyHours * 60) / activeDays)),
    };
  }
}
