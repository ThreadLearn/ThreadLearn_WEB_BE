import { z } from 'zod';
import { adaptiveSkillKeySchema } from './adaptive-plan.types';

export const ADAPTIVE_DIAGNOSTIC_QUESTION_COUNT = 10;

export const generatedDiagnosticQuestionSchema = z.object({
  skillKey: adaptiveSkillKeySchema,
  questionText: z.string().min(10).max(500),
  options: z.array(z.string().min(1).max(250)).length(4),
  correctAnswerIndex: z.number().int().min(0).max(3),
});

export const generatedDiagnosticSchema = z.object({
  questions: z
    .array(generatedDiagnosticQuestionSchema)
    .length(ADAPTIVE_DIAGNOSTIC_QUESTION_COUNT),
});

export type GeneratedDiagnosticQuestion = z.infer<typeof generatedDiagnosticQuestionSchema>;

export const ADAPTIVE_DIAGNOSTIC_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['questions'],
  properties: {
    questions: {
      type: 'array',
      minItems: ADAPTIVE_DIAGNOSTIC_QUESTION_COUNT,
      maxItems: ADAPTIVE_DIAGNOSTIC_QUESTION_COUNT,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['skillKey', 'questionText', 'options', 'correctAnswerIndex'],
        properties: {
          skillKey: { type: 'string', enum: adaptiveSkillKeySchema.options },
          questionText: { type: 'string' },
          options: {
            type: 'array',
            minItems: 4,
            maxItems: 4,
            items: { type: 'string' },
          },
          correctAnswerIndex: { type: 'integer', minimum: 0, maximum: 3 },
        },
      },
    },
  },
} as const;
