import { AdaptivePlanRuleService } from './adaptive-plan-rule.service';
import { AdaptivePlanService } from './adaptive-plan.service';
import { AdaptivePlanContext, AdaptivePlanDraft } from './adaptive-plan.types';
import { GeminiAdaptivePlanService } from './gemini-adaptive-plan.service';
import { AdaptiveLearningProfile } from './models/adaptive-learning-profile.model';
import { AdaptiveGoalPolicyService } from './adaptive-goal-policy.service';

jest.mock('./models/adaptive-learning-profile.model', () => ({
  AdaptiveLearningProfile: { findOneAndUpdate: jest.fn() },
}));

describe('AdaptivePlanService', () => {
  const gemini = { generate: jest.fn() } as unknown as GeminiAdaptivePlanService;
  const rules = new AdaptivePlanRuleService();
  const goalPolicy = new AdaptiveGoalPolicyService();
  const service = new AdaptivePlanService(gemini, rules, goalPolicy);
  const lesson = {
    id: '64b000000000000000000001',
    slug: 'js-promises-deep',
    title: 'Promises Deep Dive',
    estimatedMinutes: 45,
    orderIndex: 1,
    skillKey: 'ASYNC_PRIMITIVES' as const,
    isCompleted: false,
  };
  const laterLesson = {
    ...lesson,
    id: '64b000000000000000000002',
    slug: 'js-async-await-mastery',
    title: 'Async await mastery',
    orderIndex: 2,
  };
  const context: AdaptivePlanContext = {
    goal: 'INTERVIEW_PREP',
    scope: 'FOCUSED',
    weeklyHours: 2,
    progressPercent: 20,
    overallMastery: 35,
    riskLevel: 'HIGH',
    riskSignals: ['Low mastery'],
    requiredLessonIds: [lesson.id, laterLesson.id],
    selectedRemainingLessons: 2,
    totalRemainingLessons: 4,
    skills: [{ skillKey: 'ASYNC_PRIMITIVES', label: 'Async', score: 35, confidence: 100 }],
    lessons: [lesson, laterLesson],
  };
  const profile = {
    _id: '64a000000000000000000001',
    courseId: '64a000000000000000000002',
    planVersion: 0,
    version: 2,
    ...context,
    skillScores: context.skills,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (service as unknown as { loadContext: jest.Mock }).loadContext = jest
      .fn()
      .mockResolvedValue({
        profile,
        lessons: context.lessons,
        selection: {
          scope: context.scope,
          requiredLessonIds: context.requiredLessonIds,
          selectedRemainingLessons: context.selectedRemainingLessons,
          totalRemainingLessons: context.totalRemainingLessons,
        },
      });
    (AdaptiveLearningProfile.findOneAndUpdate as jest.Mock).mockImplementation((_filter, update) =>
      Promise.resolve({ latestPlan: update.$set.latestPlan })
    );
  });

  it('falls back to a deterministic plan when Gemini is unavailable', async () => {
    (gemini.generate as jest.Mock).mockRejectedValue(
      new Error('Gemini API key is not configured.')
    );

    await expect(service.generate('user-1', 'course')).resolves.toMatchObject({
      version: 1,
      diagnosticVersion: 2,
      generatedBy: 'RULE_ENGINE',
      fallbackReason: 'Gemini API key is not configured.',
      nextBestLessonId: lesson.id,
      goal: 'INTERVIEW_PREP',
      scope: 'FOCUSED',
      coverage: { selectedLessons: 2, totalRemainingLessons: 4, percentage: 50 },
    });
  });

  it('rejects a hallucinated lesson ID and falls back before saving', async () => {
    const invalidDraft: AdaptivePlanDraft = {
      summary: 'AI plan',
      strengths: [],
      weaknesses: [],
      weeklyPlan: [
        {
          week: 1,
          focusSkillKey: 'ASYNC_PRIMITIVES',
          lessonIds: ['64b000000000000000000099'],
          goal: 'Study async',
          reason: 'Weak skill',
        },
      ],
      nextBestLessonId: '64b000000000000000000099',
      coachMessage: 'Start now',
    };
    (gemini.generate as jest.Mock).mockResolvedValue(invalidDraft);

    const result = await service.generate('user-1', 'course');

    expect(result.generatedBy).toBe('RULE_ENGINE');
    expect(result.nextBestLessonId).toBe(lesson.id);
    expect(AdaptiveLearningProfile.findOneAndUpdate).toHaveBeenCalledTimes(1);
  });

  it('rejects an AI plan that omits a lesson required by the selected goal', async () => {
    (gemini.generate as jest.Mock).mockResolvedValue({
      summary: 'Incomplete AI plan',
      strengths: [],
      weaknesses: [],
      weeklyPlan: [
        {
          week: 1,
          focusSkillKey: 'ASYNC_PRIMITIVES',
          lessonIds: [lesson.id],
          goal: 'Study async',
          reason: 'Focused practice',
        },
      ],
      nextBestLessonId: lesson.id,
      coachMessage: 'Start now',
    } satisfies AdaptivePlanDraft);

    const result = await service.generate('user-1', 'course');

    expect(result.generatedBy).toBe('RULE_ENGINE');
    expect(result.weeklyPlan.flatMap((week) => week.lessons.map((item) => item.lessonId))).toEqual([
      lesson.id,
      laterLesson.id,
    ]);
  });

  it('rejects an AI plan that changes curriculum order', async () => {
    (gemini.generate as jest.Mock).mockResolvedValue({
      summary: 'Reordered AI plan',
      strengths: [],
      weaknesses: [],
      weeklyPlan: [
        {
          week: 1,
          focusSkillKey: 'ASYNC_PRIMITIVES',
          lessonIds: [laterLesson.id, lesson.id],
          goal: 'Study async',
          reason: 'Focused practice',
        },
      ],
      nextBestLessonId: laterLesson.id,
      coachMessage: 'Start now',
    } satisfies AdaptivePlanDraft);

    const result = await service.generate('user-1', 'course');

    expect(result.generatedBy).toBe('RULE_ENGINE');
    expect(result.nextBestLessonId).toBe(lesson.id);
  });

  it('marks a lesson completed from current enrollment progress without regenerating the plan', () => {
    const storedPlan = {
      version: 1,
      diagnosticVersion: 2,
      goal: 'INTERVIEW_PREP',
      scope: 'FOCUSED',
      coverage: { selectedLessons: 2, totalRemainingLessons: 4, percentage: 50 },
      generatedBy: 'RULE_ENGINE',
      summary: 'Plan',
      strengths: [],
      weaknesses: [],
      weeklyPlan: [
        {
          week: 1,
          focusSkillKey: 'ASYNC_PRIMITIVES',
          focusLabel: 'Async',
          lessons: [
            {
              lessonId: lesson.id,
              slug: lesson.slug,
              title: lesson.title,
              estimatedMinutes: 45,
              isReview: false,
            },
          ],
          goal: 'Study async',
          reason: 'Weak skill',
          estimatedMinutes: 45,
        },
      ],
      nextBestLessonId: lesson.id,
      coachMessage: 'Start now',
      generatedAt: new Date('2026-08-04T00:00:00.000Z'),
    };

    const serialized = (
      service as unknown as {
        serializeSnapshot: (
          plan: typeof storedPlan,
          goal: 'INTERVIEW_PREP',
          completedIds: Set<string>,
        ) => { weeklyPlan: Array<{ lessons: Array<{ isCompleted: boolean }> }> };
      }
    ).serializeSnapshot(storedPlan, 'INTERVIEW_PREP', new Set([lesson.id]));

    expect(serialized.weeklyPlan[0].lessons[0].isCompleted).toBe(true);
  });
});
