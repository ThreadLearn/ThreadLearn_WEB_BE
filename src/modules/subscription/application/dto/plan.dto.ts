import { z } from '../../../../common/zod/z';

export const planIdParamSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, 'Invalid plan id.');

export const createPlanSchema = z.object({
  name: z.string().min(1, 'name is required.').max(120),
  description: z.string().max(1000).optional(),
  price: z.number().min(0, 'price cannot be negative.'),
  currency: z.string().min(1).max(10).optional(),
  durationDays: z.number().int().min(1, 'durationDays must be positive.'),
  features: z.array(z.string().min(1)).optional(),
  isActive: z.boolean().optional(),
});

export const updatePlanSchema = createPlanSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one field is required.',
);

export const listPlansQuerySchema = z.object({
  includeInactive: z.preprocess(
    (value) => (typeof value === 'string' ? value === 'true' : value),
    z.boolean().optional(),
  ),
});

export const purchasePlanSchema = z.object({
  planId: planIdParamSchema,
});

export const purchaseIdParamSchema = planIdParamSchema;

export const paymentWebhookSchema = z.record(z.unknown());

export type CreatePlanDto = z.infer<typeof createPlanSchema>;
export type UpdatePlanDto = z.infer<typeof updatePlanSchema>;
export type ListPlansQueryDto = z.infer<typeof listPlansQuerySchema>;
export type PurchasePlanDto = z.infer<typeof purchasePlanSchema>;
export type PaymentWebhookDto = z.infer<typeof paymentWebhookSchema>;
