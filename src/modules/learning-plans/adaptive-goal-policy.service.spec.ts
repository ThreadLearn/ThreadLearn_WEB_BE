import { AdaptiveGoalPolicyService } from './adaptive-goal-policy.service';
import { AdaptiveLessonCandidate, AdaptivePlanContext } from './adaptive-plan.types';

describe('AdaptiveGoalPolicyService', () => {
  const service = new AdaptiveGoalPolicyService();
  const lessons: AdaptiveLessonCandidate[] = [
    ['runtime-1', 1, 'RUNTIME_EVENT_LOOP'],
    ['runtime-2', 2, 'RUNTIME_EVENT_LOOP'],
    ['async-1', 3, 'ASYNC_PRIMITIVES'],
    ['async-2', 4, 'ASYNC_PRIMITIVES'],
    ['race-1', 5, 'RACE_SAFE_PATTERNS'],
    ['queue-1', 6, 'JOB_QUEUE_CAPSTONE'],
    ['queue-2', 7, 'JOB_QUEUE_CAPSTONE'],
  ].map(([id, orderIndex, skillKey]) => ({
    id: String(id),
    slug: String(id),
    title: String(id),
    estimatedMinutes: 30,
    orderIndex: Number(orderIndex),
    skillKey: skillKey as AdaptiveLessonCandidate['skillKey'],
    isCompleted: false,
  }));
  const skills: AdaptivePlanContext['skills'] = [
    { skillKey: 'RUNTIME_EVENT_LOOP', label: 'Runtime', score: 80, confidence: 100 },
    { skillKey: 'ASYNC_PRIMITIVES', label: 'Async', score: 30, confidence: 100 },
    { skillKey: 'RACE_SAFE_PATTERNS', label: 'Race', score: 60, confidence: 100 },
    { skillKey: 'JOB_QUEUE_CAPSTONE', label: 'Queue', score: 80, confidence: 100 },
  ];

  it('keeps every remaining lesson in curriculum order for course completion', () => {
    const selection = service.select('COMPLETE_COURSE', lessons, skills);

    expect(selection.scope).toBe('FULL_COURSE');
    expect(selection.requiredLessonIds).toEqual(lessons.map((lesson) => lesson.id));
    expect(selection.lessons.map((lesson) => lesson.id)).toEqual(
      lessons.map((lesson) => lesson.id),
    );
  });

  it('creates a smaller interview scope based on mastery without reordering lessons', () => {
    const selection = service.select('INTERVIEW_PREP', lessons, skills);

    expect(selection.scope).toBe('FOCUSED');
    expect(selection.requiredLessonIds).toEqual([
      'runtime-2',
      'async-1',
      'async-2',
      'race-1',
    ]);
    expect(selection.requiredLessonIds).not.toContain('queue-1');
  });

  it('adds runtime foundations to a project path only when runtime mastery is low', () => {
    const lowRuntime = skills.map((skill) =>
      skill.skillKey === 'RUNTIME_EVENT_LOOP' ? { ...skill, score: 20 } : skill,
    );

    const strongSelection = service.select('BUILD_PROJECT', lessons, skills);
    const weakSelection = service.select('BUILD_PROJECT', lessons, lowRuntime);

    expect(strongSelection.requiredLessonIds).not.toContain('runtime-1');
    expect(weakSelection.requiredLessonIds).toEqual(expect.arrayContaining(['runtime-1', 'runtime-2']));
  });

  it('keeps the fallback review inside the selected focused goal', () => {
    const completedLessons = lessons.map((lesson) => ({ ...lesson, isCompleted: true }));
    const strongSkills = skills.map((skill) => ({ ...skill, score: 80 }));

    const selection = service.select('INTERVIEW_PREP', completedLessons, strongSkills);

    expect(selection.lessons).toHaveLength(1);
    expect(selection.lessons[0].skillKey).toBe('RACE_SAFE_PATTERNS');
  });
});
