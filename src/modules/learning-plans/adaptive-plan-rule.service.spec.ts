import { AdaptivePlanRuleService } from './adaptive-plan-rule.service';
import { AdaptivePlanContext } from './adaptive-plan.types';

describe('AdaptivePlanRuleService', () => {
  const service = new AdaptivePlanRuleService();
  const context: AdaptivePlanContext = {
    goal: 'COMPLETE_COURSE',
    weeklyHours: 1,
    progressPercent: 30,
    overallMastery: 48,
    riskLevel: 'HIGH',
    riskSignals: ['Low mastery'],
    skills: [
      { skillKey: 'RUNTIME_EVENT_LOOP', label: 'Runtime', score: 80, confidence: 100 },
      { skillKey: 'ASYNC_PRIMITIVES', label: 'Async', score: 30, confidence: 100 },
      { skillKey: 'RACE_SAFE_PATTERNS', label: 'Race', score: 50, confidence: 100 },
      { skillKey: 'JOB_QUEUE_CAPSTONE', label: 'Queue', score: 70, confidence: 100 },
    ],
    lessons: [
      {
        id: '64b000000000000000000001',
        slug: 'js-runtime-architecture',
        title: 'Runtime',
        estimatedMinutes: 30,
        orderIndex: 1,
        skillKey: 'RUNTIME_EVENT_LOOP',
        isCompleted: false,
      },
      {
        id: '64b000000000000000000002',
        slug: 'js-promises-deep',
        title: 'Promises',
        estimatedMinutes: 45,
        orderIndex: 2,
        skillKey: 'ASYNC_PRIMITIVES',
        isCompleted: false,
      },
      {
        id: '64b000000000000000000003',
        slug: 'js-async-await-mastery',
        title: 'Async await',
        estimatedMinutes: 45,
        orderIndex: 3,
        skillKey: 'ASYNC_PRIMITIVES',
        isCompleted: true,
      },
    ],
  };

  it('starts with an incomplete lesson from the weakest skill', () => {
    const plan = service.generate(context);

    expect(plan.nextBestLessonId).toBe('64b000000000000000000002');
    expect(plan.weeklyPlan[0]).toMatchObject({
      focusSkillKey: 'ASYNC_PRIMITIVES',
      lessonIds: ['64b000000000000000000002'],
    });
    expect(plan.weaknesses[0].skillKey).toBe('ASYNC_PRIMITIVES');
  });

  it('uses completed lessons only as review when no incomplete lesson remains', () => {
    const completedContext = {
      ...context,
      lessons: context.lessons.map((lesson) => ({ ...lesson, isCompleted: true })),
    };

    const plan = service.generate(completedContext);

    expect(plan.weeklyPlan).not.toHaveLength(0);
    expect(context.lessons.map((lesson) => lesson.id)).toContain(plan.nextBestLessonId);
  });
});
