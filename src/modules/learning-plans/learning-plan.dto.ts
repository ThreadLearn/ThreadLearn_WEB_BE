import { z } from 'zod';

const dateOnly = /^\d{4}-\d{2}-\d{2}$/;
const timeOfDay = /^([01]\d|2[0-3]):[0-5]\d$/;

export const updateLearningPlanSchema = z.object({
  weeklyHours: z.number().min(1).max(40),
  preferredDays: z
    .array(z.number().int().min(0).max(6))
    .min(1)
    .max(7)
    .refine((days) => new Set(days).size === days.length, 'Preferred days must be unique.'),
  targetDate: z.string().regex(dateOnly, 'Target date must use YYYY-MM-DD.').nullable().optional(),
  reminderEnabled: z.boolean(),
  emailReminderEnabled: z.boolean().optional(),
  reminderTime: z.string().regex(timeOfDay, 'Reminder time must use HH:mm.').optional(),
  timezone: z.string().min(1).max(100).optional(),
});

export type UpdateLearningPlanDto = z.infer<typeof updateLearningPlanSchema>;

export const courseIdParamSchema = z.string().min(1);

export const updateCourseLearningGoalSchema = z.object({
  targetDate: z.string().regex(dateOnly, 'Target date must use YYYY-MM-DD.'),
  priority: z.enum(['HIGH', 'NORMAL', 'LOW']).default('NORMAL'),
});

export type UpdateCourseLearningGoalDto = z.infer<typeof updateCourseLearningGoalSchema>;

export const adaptiveCourseSlugParamSchema = z.string().min(1).max(100);

export const submitAdaptiveDiagnosticSchema = z.object({
  goal: z.enum(['COMPLETE_COURSE', 'INTERVIEW_PREP', 'BUILD_PROJECT']),
  weeklyHours: z.number().int().min(1).max(40).optional(),
  answers: z.record(z.string().min(1), z.number().int().min(0).max(20)),
});

export type SubmitAdaptiveDiagnosticDto = z.infer<typeof submitAdaptiveDiagnosticSchema>;
