import { Injectable } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from '../../common/custom-error';
import { Enrollment } from '../enrollments/models/enrollment.model';
import { Lesson } from '../lessons/models/lesson.model';
import { UpdateCourseLearningGoalDto } from './learning-plan.dto';
import {
  CourseGoalPriority,
  CourseLearningGoal,
  ICourseLearningGoal,
} from './models/course-learning-goal.model';
import { LearningPlan } from './models/learning-plan.model';

const PRIORITY_WEIGHTS: Record<CourseGoalPriority, number> = { HIGH: 3, NORMAL: 2, LOW: 1 };
const FALLBACK_LESSON_MINUTES = 30;

@Injectable()
export class CourseLearningGoalsService {
  async getMine(userId: string, courseId: string) {
    const goal = await CourseLearningGoal.findOne({ userId, courseId });
    return goal ? this.toSummary(goal) : null;
  }

  async listMine(userId: string) {
    const goals = await CourseLearningGoal.find({ userId }).sort({ targetDate: 1 });
    return Promise.all(goals.map((goal) => this.toSummary(goal)));
  }

  async upsertMine(userId: string, courseId: string, input: UpdateCourseLearningGoalDto) {
    const enrollment = await Enrollment.findOne({ userId, courseId });
    if (!enrollment)
      throw new ForbiddenError('Enroll in this course before setting a completion target.');

    const goal = await CourseLearningGoal.findOneAndUpdate(
      { userId, courseId },
      {
        $set: {
          enrollmentId: enrollment._id,
          targetDate: new Date(input.targetDate + 'T23:59:59.999Z'),
          priority: input.priority,
        },
        $setOnInsert: { userId, courseId },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return this.toSummary(goal);
  }

  async removeMine(userId: string, courseId: string) {
    const deleted = await CourseLearningGoal.findOneAndDelete({ userId, courseId });
    if (!deleted) throw new NotFoundError('Course completion target not found.');
    return { deleted: true };
  }

  private async toSummary(goal: ICourseLearningGoal) {
    const [enrollment, plan, activeGoals, lessons] = await Promise.all([
      Enrollment.findById(goal.enrollmentId),
      LearningPlan.findOne({ userId: goal.userId }),
      CourseLearningGoal.find({ userId: goal.userId }),
      Lesson.find({ courseId: goal.courseId, status: { $nin: ['hidden', 'deleted'] } })
        .select('_id estimatedTime')
        .lean(),
    ]);
    if (!enrollment) throw new NotFoundError('Course enrollment not found.');

    const completedIds = new Set(enrollment.completedLessons.map(String));
    const duration = (lesson: { estimatedTime: number }) =>
      lesson.estimatedTime > 0 ? lesson.estimatedTime : FALLBACK_LESSON_MINUTES;
    const totalMinutes = lessons.reduce((sum, lesson) => sum + duration(lesson), 0);
    const completedMinutes = lessons
      .filter((lesson) => completedIds.has(String(lesson._id)))
      .reduce((sum, lesson) => sum + duration(lesson), 0);
    const remainingMinutes = Math.max(0, totalMinutes - completedMinutes);
    const activeDays = plan?.preferredDays?.length || 3;
    const weeklyMinutes = (plan?.weeklyHours || 3) * 60;
    const totalWeight = activeGoals.reduce((sum, item) => sum + PRIORITY_WEIGHTS[item.priority], 0);
    const allocatedMinutesPerWeek = Math.round(
      weeklyMinutes * (PRIORITY_WEIGHTS[goal.priority] / Math.max(1, totalWeight))
    );
    const sessionMinutes = Math.max(15, Math.round(allocatedMinutesPerWeek / activeDays));
    const sessionsRemaining = this.countSessions(plan?.preferredDays || [1, 3, 5], goal.targetDate);
    const availableMinutes = sessionsRemaining * sessionMinutes;
    const completed = enrollment.completed || remainingMinutes === 0;
    const status = completed
      ? 'COMPLETED'
      : goal.targetDate.getTime() < Date.now()
        ? 'BEHIND'
        : remainingMinutes <= availableMinutes
          ? 'ON_TRACK'
          : 'AT_RISK';

    return {
      courseId: String(goal.courseId),
      enrollmentId: String(goal.enrollmentId),
      targetDate: goal.targetDate.toISOString(),
      priority: goal.priority,
      status,
      progressPercent: Math.round(enrollment.progress),
      totalMinutes,
      completedMinutes,
      remainingMinutes,
      sessionsRemaining,
      allocatedMinutesPerWeek,
      suggestedSessionMinutes: sessionMinutes,
      availableMinutes,
    };
  }

  private countSessions(preferredDays: number[], targetDate: Date) {
    const target = targetDate.toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    if (target < today) return 0;

    let count = 0;
    for (
      let cursor = new Date(today + 'T12:00:00Z');
      cursor <= new Date(target + 'T12:00:00Z');
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    ) {
      if (preferredDays.includes(cursor.getUTCDay())) count += 1;
    }
    return count;
  }
}
