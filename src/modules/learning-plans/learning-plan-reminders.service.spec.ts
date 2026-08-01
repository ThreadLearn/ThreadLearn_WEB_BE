import { NotificationsService } from '../notifications/services/notifications.service';
import { EmailService } from '../auth/services/email.service';
import { User } from '../auth/models/user.model';
import { CourseLearningGoalsService } from './course-learning-goals.service';
import { LearningPlanRemindersService } from './learning-plan-reminders.service';
import { LearningPlan } from './models/learning-plan.model';

jest.mock('./models/learning-plan.model', () => ({ LearningPlan: { find: jest.fn() } }));
jest.mock('../auth/models/user.model', () => ({ User: { findOne: jest.fn() } }));
jest.mock('../auth/services/email.service', () => ({
  EmailService: { sendLearningPlanReminderEmail: jest.fn() },
}));

describe('LearningPlanRemindersService', () => {
  const courseGoals = { listMine: jest.fn() } as unknown as CourseLearningGoalsService;
  const service = new LearningPlanRemindersService(courseGoals);

  beforeEach(() => jest.clearAllMocks());

  afterEach(() => jest.useRealTimers());

  it('sends a study reminder and an at-risk course alert at the learner local reminder time', async () => {
    (LearningPlan.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            userId: 'user-1',
            weeklyHours: 5,
            preferredDays: [1, 3, 5],
            emailReminderEnabled: true,
            reminderTime: '15:00',
            timezone: 'Asia/Bangkok',
          },
        ]),
      }),
    });
    (courseGoals.listMine as jest.Mock).mockResolvedValue([
      { courseId: 'course-1', status: 'AT_RISK', remainingMinutes: 120, sessionsRemaining: 1 },
      { courseId: 'course-2', status: 'ON_TRACK', remainingMinutes: 30, sessionsRemaining: 3 },
    ]);
    (User.findOne as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ email: 'student@example.com', firstName: 'Student' }),
      }),
    });
    const send = jest.spyOn(NotificationsService, 'sendNotification').mockResolvedValue({} as any);
    jest.useFakeTimers().setSystemTime(new Date('2026-07-29T08:00:00.000Z'));

    await service.dispatchScheduledReminders();

    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        eventKey: 'LEARNING_PLAN_STUDY_REMINDER:user-1:2026-07-29',
        type: 'SYSTEM',
      })
    );
    expect(EmailService.sendLearningPlanReminderEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'student@example.com',
        firstName: 'Student',
        sessionMinutes: 100,
        atRiskGoalCount: 1,
        behindGoalCount: 0,
      })
    );
    expect(User.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        isActive: true,
        emailVerifiedAt: { $exists: true, $ne: null },
      })
    );
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        eventKey: 'LEARNING_PLAN_GOAL_ALERT:user-1:course-1:2026-07-29:AT_RISK',
        type: 'SYSTEM',
      })
    );
  });

  it('does nothing when the configured local time does not match the cron minute', async () => {
    (LearningPlan.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            userId: 'user-1',
            weeklyHours: 3,
            preferredDays: [1, 3, 5],
            reminderTime: '19:00',
            timezone: 'Asia/Bangkok',
          },
        ]),
      }),
    });
    const send = jest.spyOn(NotificationsService, 'sendNotification').mockResolvedValue({} as any);
    jest.useFakeTimers().setSystemTime(new Date('2026-07-29T08:00:00.000Z'));

    await service.dispatchScheduledReminders();

    expect(courseGoals.listMine).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
    expect(EmailService.sendLearningPlanReminderEmail).not.toHaveBeenCalled();
  });

  it('does not send an email when the learner has not enabled email reminders', async () => {
    (LearningPlan.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            userId: 'user-1',
            weeklyHours: 5,
            preferredDays: [1, 3, 5],
            emailReminderEnabled: false,
            reminderTime: '15:00',
            timezone: 'Asia/Bangkok',
          },
        ]),
      }),
    });
    (courseGoals.listMine as jest.Mock).mockResolvedValue([]);
    jest.spyOn(NotificationsService, 'sendNotification').mockResolvedValue({} as any);
    jest.useFakeTimers().setSystemTime(new Date('2026-07-29T08:00:00.000Z'));

    await service.dispatchScheduledReminders();

    expect(User.findOne).not.toHaveBeenCalled();
    expect(EmailService.sendLearningPlanReminderEmail).not.toHaveBeenCalled();
  });

  it('does not send a duplicate email when the study notification already exists', async () => {
    (LearningPlan.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            userId: 'user-1',
            weeklyHours: 5,
            preferredDays: [1, 3, 5],
            emailReminderEnabled: true,
            reminderTime: '15:00',
            timezone: 'Asia/Bangkok',
          },
        ]),
      }),
    });
    (courseGoals.listMine as jest.Mock).mockResolvedValue([]);
    jest.spyOn(NotificationsService, 'sendNotification').mockRejectedValue({ code: 11000 } as any);
    jest.useFakeTimers().setSystemTime(new Date('2026-07-29T08:00:00.000Z'));

    await service.dispatchScheduledReminders();

    expect(User.findOne).not.toHaveBeenCalled();
    expect(EmailService.sendLearningPlanReminderEmail).not.toHaveBeenCalled();
  });
});
