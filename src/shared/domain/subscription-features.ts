export const SUBSCRIPTION_FEATURES = [
  {
    key: 'PREMIUM_COURSES',
    label: 'Khoa hoc Premium',
    description: 'Mo khoa dang ky va truy cap cac khoa hoc, bai hoc Premium.',
  },
  {
    key: 'AI_ADVANCED_ANALYSIS',
    label: 'Phan tich AI nang cao',
    description: 'Mo han muc AI Premium va cac goi y phan tich chi tiet.',
  },
] as const;

export type SubscriptionFeatureKey = (typeof SUBSCRIPTION_FEATURES)[number]['key'];

export const ALL_SUBSCRIPTION_FEATURE_KEYS: SubscriptionFeatureKey[] = SUBSCRIPTION_FEATURES.map(
  ({ key }) => key,
);

const LEGACY_FEATURE_ALIASES: Record<string, SubscriptionFeatureKey[]> = {
  'AI hints': ['AI_ADVANCED_ANALYSIS'],
  'Premium lessons': ['PREMIUM_COURSES'],
  Everything: ALL_SUBSCRIPTION_FEATURE_KEYS,
  'All Premium Monthly': ALL_SUBSCRIPTION_FEATURE_KEYS,
  'Long retention': ['AI_ADVANCED_ANALYSIS'],
  'Demo-ready path': ['PREMIUM_COURSES'],
};

export function isSubscriptionFeatureKey(value: string): value is SubscriptionFeatureKey {
  return ALL_SUBSCRIPTION_FEATURE_KEYS.includes(value as SubscriptionFeatureKey);
}

/** Converts historical display strings to the canonical, enforceable feature keys. */
export function normalizeSubscriptionFeatures(features: readonly string[] = []): SubscriptionFeatureKey[] {
  return [...new Set(features.flatMap((feature) => {
    if (isSubscriptionFeatureKey(feature)) return [feature];
    return LEGACY_FEATURE_ALIASES[feature] ?? [];
  }))];
}

/**
 * Older Premium users predate feature grants. They retain existing Premium access until
 * their subscription expires; new payments always persist an explicit feature set.
 */
export function hasActiveSubscriptionFeature(input: {
  planType?: string;
  subscriptionExpiresAt?: Date;
  subscriptionFeatures?: readonly string[];
  feature: SubscriptionFeatureKey;
  now?: Date;
}): boolean {
  const now = input.now ?? new Date();
  if (input.planType !== 'PREMIUM') return false;
  if (input.subscriptionExpiresAt && input.subscriptionExpiresAt.getTime() <= now.getTime()) return false;
  if (input.subscriptionFeatures === undefined) return true;
  return normalizeSubscriptionFeatures(input.subscriptionFeatures).includes(input.feature);
}
