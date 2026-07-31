import { LearningPlansService } from './learning-plans.service';
import { LearningPlan } from './models/learning-plan.model';

jest.mock('./models/learning-plan.model', () => ({
  LearningPlan: {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
}));

describe('LearningPlansService', () => {
  const service = new LearningPlansService();

  beforeEach(() => jest.clearAllMocks());

  it('returns a usable default plan before a learner has configured one', async () => {
    (LearningPlan.findOne as jest.Mock).mockResolvedValue(null);

    await expect(service.getMine('user-1')).resolves.toEqual({
      weeklyHours: 3,
      preferredDays: [1, 3, 5],
      targetDate: null,
      reminderEnabled: true,
      emailReminderEnabled: false,
      reminderTime: '19:00',
      timezone: 'Asia/Ho_Chi_Minh',
      isConfigured: false,
      suggestedSessionMinutes: 60,
    });
  });

  it('stores a sorted study rhythm and returns the calculated session length', async () => {
    const stored = {
      weeklyHours: 4,
      preferredDays: [1, 3, 5],
      targetDate: new Date('2026-08-30T23:59:59.999Z'),
      reminderEnabled: true,
      emailReminderEnabled: true,
      reminderTime: '20:30',
      timezone: 'Asia/Bangkok',
    };
    (LearningPlan.findOneAndUpdate as jest.Mock).mockResolvedValue(stored);

    const result = await service.updateMine('user-1', {
      weeklyHours: 4,
      preferredDays: [5, 1, 3],
      targetDate: '2026-08-30',
      reminderEnabled: true,
      emailReminderEnabled: true,
      reminderTime: '20:30',
      timezone: 'Asia/Bangkok',
    });

    expect(LearningPlan.findOneAndUpdate).toHaveBeenCalledWith(
      { userId: 'user-1' },
      expect.objectContaining({
        $set: expect.objectContaining({ preferredDays: [1, 3, 5] }),
      }),
      expect.objectContaining({ upsert: true }),
    );
    expect(result.suggestedSessionMinutes).toBe(80);
    expect(result.emailReminderEnabled).toBe(true);
    expect(result.isConfigured).toBe(true);
  });
});
