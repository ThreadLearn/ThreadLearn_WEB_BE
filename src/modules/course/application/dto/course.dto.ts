import { z } from '../../../../common/zod/z';

/** Coerce 'true'/'false' (query string) → boolean thật. z.coerce.boolean() coi mọi string khác rỗng là true nên không dùng được. */
const booleanish = z.preprocess(
  (v) => (typeof v === 'string' ? (v === 'true' ? true : v === 'false' ? false : v) : v),
  z.boolean(),
);

export const courseLanguageSchema = z.enum(['javascript', 'java', 'python']);
export const courseLevelSchema = z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']);

export const courseIdParamSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, 'Invalid course id.');

const instructorIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid instructor id.');

export const createCourseSchema = z.object({
  title: z.string().min(1, 'title is required.').max(200),
  description: z.string().min(1, 'description is required.'),
  shortDescription: z.string().max(500).optional(),
  thumbnailUrl: z.string().optional(),
  language: courseLanguageSchema.optional(),
  level: courseLevelSchema.optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  isPremium: z.boolean().optional(),
  price: z.number().min(0).optional(),
  prerequisites: z.array(z.string()).optional(),
  prerequisiteThreshold: z.number().min(0).max(100).optional(),
  estimatedDuration: z.number().min(0).optional(),
  instructorId: instructorIdSchema.optional(),
  // A course can only be published through PATCH /:id/publish, which verifies
  // that it has active lessons before exposing it to learners.
  status: z.enum(['draft', 'hidden']).optional(),
});

// Ownership has a dedicated Admin-only endpoint and must never be mass-assigned by PUT /courses/:id.
export const updateCourseSchema = createCourseSchema.omit({ instructorId: true }).partial();

export const assignCourseInstructorSchema = z.object({
  instructorId: instructorIdSchema.nullable(),
});

export const setVisibilitySchema = z.object({
  status: z.enum(['published', 'hidden', 'draft']).default('published'),
});

export const listCoursesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().optional(),
  search: z.string().optional(),
  level: courseLevelSchema.optional(),
  language: courseLanguageSchema.optional(),
  tag: z.string().optional(),
  category: z.string().optional(),
  isPremium: booleanish.optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  status: z.enum(['draft', 'published', 'hidden', 'archived', 'deleted']).optional(),
  includeAll: booleanish.optional(),
});

export type CreateCourseDto = z.infer<typeof createCourseSchema>;
export type UpdateCourseDto = z.infer<typeof updateCourseSchema>;
export type SetVisibilityDto = z.infer<typeof setVisibilitySchema>;
export type ListCoursesQueryDto = z.infer<typeof listCoursesQuerySchema>;
export type AssignCourseInstructorDto = z.infer<typeof assignCourseInstructorSchema>;
