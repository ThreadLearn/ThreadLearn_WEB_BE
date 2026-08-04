export const ADAPTIVE_COURSE_SLUG = 'js-concurrency-fundamentals';

export type AdaptiveSkillKey =
  | 'RUNTIME_EVENT_LOOP'
  | 'ASYNC_PRIMITIVES'
  | 'RACE_SAFE_PATTERNS'
  | 'JOB_QUEUE_CAPSTONE';

export interface AdaptiveSkillDefinition {
  key: AdaptiveSkillKey;
  label: string;
  description: string;
  lessonSlugs: string[];
}

export const ADAPTIVE_SKILLS: readonly AdaptiveSkillDefinition[] = [
  {
    key: 'RUNTIME_EVENT_LOOP',
    label: 'Runtime & Event Loop',
    description: 'Concurrency foundations, runtime architecture, microtasks, and macrotasks.',
    lessonSlugs: [
      'js-concurrent-vs-parallel',
      'js-runtime-architecture',
      'js-call-stack-heap',
      'js-event-loop-deep',
    ],
  },
  {
    key: 'ASYNC_PRIMITIVES',
    label: 'Async Primitives',
    description: 'Promises, async/await, combinators, cancellation, and safe async composition.',
    lessonSlugs: [
      'js-callbacks-hell',
      'js-promises-deep',
      'js-async-await-mastery',
      'js-promise-combinators',
      'js-abort-controller',
    ],
  },
  {
    key: 'RACE_SAFE_PATTERNS',
    label: 'Race Conditions & Safe Patterns',
    description: 'Logic races, serialized critical sections, mutexes, and request coalescing.',
    lessonSlugs: [
      'js-logic-race-conditions',
      'js-promise-mutex',
      'js-debounce-throttle-coalesce',
    ],
  },
  {
    key: 'JOB_QUEUE_CAPSTONE',
    label: 'Job Queue & Production Readiness',
    description: 'Backpressure, production async APIs, bounded concurrency, and the capstone.',
    lessonSlugs: [
      'js-streams-backpressure',
      'js-async-api-checklist',
      'js-capstone-job-queue',
    ],
  },
] as const;

/**
 * The diagnostic deliberately reuses the 11 existing questions from the JS
 * midterm and final. Keeping the mapping beside the curriculum avoids exposing
 * correct answers or duplicating a second question bank for the MVP.
 */
export const DIAGNOSTIC_QUIZ_BLUEPRINT: ReadonlyArray<{
  lessonSlug: 'js-midterm-quiz' | 'js-final-quiz';
  questionSkills: readonly AdaptiveSkillKey[];
}> = [
  {
    lessonSlug: 'js-midterm-quiz',
    questionSkills: [
      'RUNTIME_EVENT_LOOP',
      'RUNTIME_EVENT_LOOP',
      'ASYNC_PRIMITIVES',
      'ASYNC_PRIMITIVES',
      'ASYNC_PRIMITIVES',
    ],
  },
  {
    lessonSlug: 'js-final-quiz',
    questionSkills: [
      'RUNTIME_EVENT_LOOP',
      'RACE_SAFE_PATTERNS',
      'RACE_SAFE_PATTERNS',
      'ASYNC_PRIMITIVES',
      'JOB_QUEUE_CAPSTONE',
      'ASYNC_PRIMITIVES',
    ],
  },
] as const;

export const getAdaptiveSkillDefinition = (key: AdaptiveSkillKey) => {
  const definition = ADAPTIVE_SKILLS.find((skill) => skill.key === key);
  if (!definition) throw new Error(`Unknown adaptive skill: ${key}`);
  return definition;
};
