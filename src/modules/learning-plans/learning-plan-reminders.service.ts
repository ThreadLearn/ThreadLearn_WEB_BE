import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { env } from '../../configs/env';
import { logger } from '../../configs/logger';
import { EmailService } from '../auth/services/email.service';
import { User } from '../auth/models/user.model';
import { NotificationsService } from '../notifications/services/notifications.service';
import { CourseLearningGoalsService } from './course-learning-goals.service';
import { LearningPlan } from './models/learning-plan.model';

const WEEKDAY_TO_NUMBER: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

type LocalScheduleTime = {
  date: string;
  day: number;
  time: string;
};

@Injectable()
export class LearningPlanRemindersService {
  constructor(private readonly courseGoals: CourseLearningGoalsService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async dispatchScheduledReminders() {
    try {
      const plans = await LearningPlan.find({ reminderEnabled: true })
        .select('_id userId weeklyHours preferredDays reminderEnabled emailReminderEnabled reminderTime timezone')
        .lean();
      await Promise.all(plans.map((plan) => this.dispatchForPlan(plan, new Date())));
    } catch (error) {
      logger.error('Learning plan reminder job failed.', error as Error);
    }
  }

  private async dispatchForPlan(
    plan: {
      userId: unknown;
      weeklyHours: number;
      preferredDays: number[];
      emailReminderEnabled?: boolean;
      reminderTime: string;
      timezone: string;
    },
    now: Date
  ) {
    const local = this.getLocalScheduleTime(now, plan.timezone);
    if (!local || local.time !== plan.reminderTime || !plan.preferredDays.includes(local.day))
      return;

    const userId = String(plan.userId);
    const sessionMinutes = Math.max(
      15,
      Math.round((plan.weeklyHours * 60) / Math.max(1, plan.preferredDays.length))
    );
    const studyReminderCreated = await this.sendOnce({
      userId,
      eventKey: `LEARNING_PLAN_STUDY_REMINDER:${userId}:${local.date}`,
      title: 'Your study session is due',
      message: `Set aside about ${sessionMinutes} minutes to keep your weekly learning rhythm.`,
      link: '/learning-plan',
      metadata: { kind: 'STUDY_REMINDER', date: local.date, sessionMinutes },
    });

    const goals = await this.courseGoals.listMine(userId);
    const attentionGoals = goals.filter((goal) => goal.status === 'AT_RISK' || goal.status === 'BEHIND');
    await Promise.all(
      attentionGoals
        .map((goal) => {
          const isBehind = goal.status === 'BEHIND';
          return this.sendOnce({
            userId,
            eventKey: `LEARNING_PLAN_GOAL_ALERT:${userId}:${goal.courseId}:${local.date}:${goal.status}`,
            title: isBehind ? 'A course target has passed' : 'A course target needs attention',
            message: isBehind
              ? 'This course deadline has passed. Update the target date or continue learning.'
              : `${goal.remainingMinutes} minutes remain across ${goal.sessionsRemaining} planned sessions.`,
            link: `/courses/${goal.courseId}`,
            metadata: {
              kind: 'COURSE_GOAL_ALERT',
              courseId: goal.courseId,
              status: goal.status,
              date: local.date,
            },
          });
      })
    );

    if (studyReminderCreated && plan.emailReminderEnabled) {
      await this.sendEmailReminder({ userId, sessionMinutes, attentionGoals });
    }
  }

  private getLocalScheduleTime(now: Date, timezone: string): LocalScheduleTime | null {
    try {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        weekday: 'short',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).formatToParts(now);
      const values = Object.fromEntries(
        parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value])
      );
      const day = WEEKDAY_TO_NUMBER[values.weekday];
      if (day === undefined) return null;
      return {
        date: `${values.year}-${values.month}-${values.day}`,
        day,
        time: `${values.hour}:${values.minute}`,
      };
    } catch {
      logger.warn(`Learning plan reminder skipped because timezone "${timezone}" is invalid.`);
      return null;
    }
  }

  private async sendOnce(
    data: Omit<Parameters<typeof NotificationsService.sendNotification>[0], 'type'>
  ) {
    try {
      await NotificationsService.sendNotification({ ...data, type: 'SYSTEM' });
      return true;
    } catch (error: any) {
      if (error?.code === 11000) return false;
      throw error;
    }
  }

  private async sendEmailReminder({
    userId,
    sessionMinutes,
    attentionGoals,
  }: {
    userId: string;
    sessionMinutes: number;
    attentionGoals: Array<{ status: string }>;
  }) {
    const user = await User.findOne({
      _id: userId,
      isActive: true,
      emailVerifiedAt: { $exists: true, $ne: null },
    })
      .select('email firstName')
      .lean();
    if (!user) return;

    const learningPlanUrl = new URL('/learning-plan', env.FRONTEND_URL[0]).toString();
    await EmailService.sendLearningPlanReminderEmail({
      email: user.email,
      firstName: user.firstName,
      sessionMinutes,
      learningPlanUrl,
      atRiskGoalCount: attentionGoals.filter((goal) => goal.status === 'AT_RISK').length,
      behindGoalCount: attentionGoals.filter((goal) => goal.status === 'BEHIND').length,
    });
  }
}
