import { z } from 'zod';
import { AdaptiveLearningGoal } from './models/adaptive-learning-profile.model';
import { AdaptiveRiskLevel } from './adaptive-mastery.service';
import { AdaptiveSkillKey } from './adaptive-learning.config';

export const adaptiveSkillKeySchema = z.enum([
  'RUNTIME_EVENT_LOOP',
  'ASYNC_PRIMITIVES',
  'RACE_SAFE_PATTERNS',
  'JOB_QUEUE_CAPSTONE',
]);

export const adaptivePlanDraftSchema = z.object({
  summary: z.string().min(1).max(600),
  strengths: z.array(z.string().min(1).max(200)).max(4),
  weaknesses: z
    .array(
      z.object({
        skillKey: adaptiveSkillKeySchema,
        reason: z.string().min(1).max(300),
      })
    )
    .max(4),
  weeklyPlan: z
    .array(
      z.object({
        week: z.number().int().min(1).max(24),
        focusSkillKey: adaptiveSkillKeySchema,
        lessonIds: z.array(z.string().min(1)).min(1).max(6),
        goal: z.string().min(1).max(250),
        reason: z.string().min(1).max(300),
      })
    )
    .min(1)
    .max(24),
  nextBestLessonId: z.string().min(1),
  coachMessage: z.string().min(1).max(500),
});

export type AdaptivePlanDraft = z.infer<typeof adaptivePlanDraftSchema>;

export type AdaptivePlanScope = 'FULL_COURSE' | 'FOCUSED';

export interface AdaptiveLessonCandidate {
  id: string;
  slug: string;
  title: string;
  estimatedMinutes: number;
  orderIndex: number;
  skillKey: AdaptiveSkillKey;
  isCompleted: boolean;
}

export interface AdaptivePlanContext {
  goal: AdaptiveLearningGoal;
  scope: AdaptivePlanScope;
  weeklyHours: number;
  progressPercent: number;
  overallMastery: number;
  riskLevel: AdaptiveRiskLevel;
  riskSignals: string[];
  requiredLessonIds: string[];
  selectedRemainingLessons: number;
  totalRemainingLessons: number;
  skills: Array<{
    skillKey: AdaptiveSkillKey;
    label: string;
    score: number;
    confidence: number;
  }>;
  lessons: AdaptiveLessonCandidate[];
}

export const ADAPTIVE_PLAN_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'summary',
    'strengths',
    'weaknesses',
    'weeklyPlan',
    'nextBestLessonId',
    'coachMessage',
  ],
  properties: {
    summary: { type: 'string' },
    strengths: { type: 'array', maxItems: 4, items: { type: 'string' } },
    weaknesses: {
      type: 'array',
      maxItems: 4,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['skillKey', 'reason'],
        properties: {
          skillKey: { type: 'string', enum: adaptiveSkillKeySchema.options },
          reason: { type: 'string' },
        },
      },
    },
    weeklyPlan: {
      type: 'array',
      minItems: 1,
      maxItems: 24,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['week', 'focusSkillKey', 'lessonIds', 'goal', 'reason'],
        properties: {
          week: { type: 'integer', minimum: 1, maximum: 24 },
          focusSkillKey: { type: 'string', enum: adaptiveSkillKeySchema.options },
          lessonIds: {
            type: 'array',
            minItems: 1,
            maxItems: 6,
            items: { type: 'string' },
          },
          goal: { type: 'string' },
          reason: { type: 'string' },
        },
      },
    },
    nextBestLessonId: { type: 'string' },
    coachMessage: { type: 'string' },
  },
} as const;
