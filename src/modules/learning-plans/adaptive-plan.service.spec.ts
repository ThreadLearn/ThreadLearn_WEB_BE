import { AdaptivePlanRuleService } from './adaptive-plan-rule.service';
import { AdaptivePlanService } from './adaptive-plan.service';
import { AdaptivePlanContext, AdaptivePlanDraft } from './adaptive-plan.types';
import { GeminiAdaptivePlanService } from './gemini-adaptive-plan.service';
import { AdaptiveLearningProfile } from './models/adaptive-learning-profile.model';

jest.mock('./models/adaptive-learning-profile.model', () => ({
  AdaptiveLearningProfile: { findOneAndUpdate: jest.fn() },
}));

describe('AdaptivePlanService', () => {
  const gemini = { generate: jest.fn() } as unknown as GeminiAdaptivePlanService;
  const rules = new AdaptivePlanRuleService();
  const service = new AdaptivePlanService(gemini, rules);
  const lesson = {
    id: '64b000000000000000000001',
    slug: 'js-promises-deep',
    title: 'Promises Deep Dive',
    estimatedMinutes: 45,
    orderIndex: 1,
    skillKey: 'ASYNC_PRIMITIVES' as const,
    isCompleted: false,
  };
  const context: AdaptivePlanContext = {
    goal: 'INTERVIEW_PREP',
    weeklyHours: 2,
    progressPercent: 20,
    overallMastery: 35,
    riskLevel: 'HIGH',
    riskSignals: ['Low mastery'],
    skills: [{ skillKey: 'ASYNC_PRIMITIVES', label: 'Async', score: 35, confidence: 100 }],
    lessons: [lesson],
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
      .mockResolvedValue({ profile, lessons: [lesson] });
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
});
