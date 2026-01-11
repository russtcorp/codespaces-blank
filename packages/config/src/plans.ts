/**
 * Subscription plan types
 */
export const SUBSCRIPTION_PLANS = {
  TRIAL: 'trial',
  STARTER: 'starter',
  PROFESSIONAL: 'professional',
  ENTERPRISE: 'enterprise',
} as const;

export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[keyof typeof SUBSCRIPTION_PLANS];

/**
 * Subscription status types
 */
export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  TRIAL: 'trial',
  CANCELLED: 'cancelled',
  SUSPENDED: 'suspended',
} as const;

export type SubscriptionStatus =
  (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS];

/**
 * Plan limits and configurations
 */
export const PLAN_LIMITS = {
  trial: {
    maxMenuItems: 50,
    maxCategories: 10,
    maxImages: 20,
    aiTokensPerMonth: 10000,
    durationDays: 14,
  },
  starter: {
    maxMenuItems: 100,
    maxCategories: 20,
    maxImages: 50,
    aiTokensPerMonth: 50000,
    customDomain: false,
  },
  professional: {
    maxMenuItems: 500,
    maxCategories: 50,
    maxImages: 200,
    aiTokensPerMonth: 200000,
    customDomain: true,
  },
  enterprise: {
    maxMenuItems: -1, // unlimited
    maxCategories: -1, // unlimited
    maxImages: -1, // unlimited
    aiTokensPerMonth: -1, // unlimited
    customDomain: true,
    prioritySupport: true,
  },
} as const;

export type PlanLimits = (typeof PLAN_LIMITS)[keyof typeof PLAN_LIMITS];
