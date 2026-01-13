/**
 * Shared configuration constants for the Diner SaaS platform.
 * Centralized settings used across all apps.
 */

// ============================================================================
// SUPPORTED TIMEZONES
// ============================================================================
export const SUPPORTED_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Toronto",
  "America/Mexico_City",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
] as const;

export type Timezone = (typeof SUPPORTED_TIMEZONES)[number];

// ============================================================================
// SUBSCRIPTION TIERS
// ============================================================================
export const SUBSCRIPTION_PLANS = {
  FREE: {
    name: "Free",
    monthlyPrice: 0,
    maxItems: 20,
    maxCategories: 5,
    maxUsers: 1,
    features: ["basic_menu", "basic_hours", "single_user"],
  },
  STARTER: {
    name: "Starter",
    monthlyPrice: 29,
    maxItems: 100,
    maxCategories: 15,
    maxUsers: 3,
    features: [
      "advanced_menu",
      "split_shifts",
      "multiple_users",
      "basic_analytics",
    ],
  },
  PRO: {
    name: "Professional",
    monthlyPrice: 79,
    maxItems: 500,
    maxCategories: 50,
    maxUsers: 10,
    features: [
      "everything_in_starter",
      "api_access",
      "advanced_analytics",
      "ai_descriptions",
      "priority_support",
    ],
  },
  ENTERPRISE: {
    name: "Enterprise",
    monthlyPrice: 299,
    maxItems: -1, // Unlimited
    maxCategories: -1,
    maxUsers: -1,
    features: [
      "everything_in_pro",
      "dedicated_support",
      "custom_domain",
      "sso",
      "white_label",
    ],
  },
} as const;

export type PlanName = keyof typeof SUBSCRIPTION_PLANS;

// ============================================================================
// USER ROLES & PERMISSIONS
// ============================================================================
export const USER_ROLES = {
  OWNER: "owner",
  MANAGER: "manager",
  VIEWER: "viewer",
} as const;

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  owner: [
    "menu_full",
    "hours_edit",
    "analytics_view",
    "settings_edit",
    "users_manage",
    "billing_view",
  ],
  manager: [
    "menu_edit",
    "hours_view",
    "analytics_view",
    "settings_view",
  ],
  viewer: ["menu_view", "analytics_view"],
};

// ============================================================================
// OPERATING HOURS CONSTANTS
// ============================================================================
export const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const DEFAULT_HOURS = {
  BREAKFAST_START: "06:00",
  BREAKFAST_END: "11:00",
  LUNCH_START: "11:00",
  LUNCH_END: "14:00",
  DINNER_START: "17:00",
  DINNER_END: "22:00",
} as const;

// ============================================================================
// MENU ITEM CONSTANTS
// ============================================================================
export const DIETARY_TAGS = [
  "GF", // Gluten-Free
  "V", // Vegetarian
  "VG", // Vegan
  "N", // Contains Nuts
  "D", // Dairy
  "E", // Eggs
  "S", // Shellfish
  "H", // Halal
  "K", // Kosher
  "SO", // Soy
] as const;

export type DietaryTag = (typeof DIETARY_TAGS)[number];

// ============================================================================
// ERROR MESSAGES
// ============================================================================
export const ERROR_MESSAGES = {
  // Auth
  AUTH_REQUIRED: "Authentication required",
  INVALID_TOKEN: "Invalid or expired token",
  EMAIL_NOT_FOUND: "Email not found",
  PHONE_NOT_FOUND: "Phone number not found",

  // Tenant
  TENANT_NOT_FOUND: "Tenant not found",
  TENANT_INACTIVE: "Tenant account is inactive",
  TENANT_DELETED: "Tenant account has been deleted",

  // Menu
  MENU_ITEM_NOT_FOUND: "Menu item not found",
  CATEGORY_NOT_FOUND: "Category not found",
  CATEGORY_NOT_EMPTY: "Cannot delete category with items",

  // Hours
  INVALID_TIME_FORMAT: "Invalid time format (use HH:MM)",
  INVALID_TIME_RANGE: "End time must be after start time",

  // Validation
  INVALID_EMAIL: "Invalid email address",
  INVALID_PHONE: "Invalid phone number",
  PRICE_INVALID: "Price must be a positive number",

  // Database
  DATABASE_ERROR: "Database operation failed",
  CONFLICT: "Resource already exists",

  // Permissions
  INSUFFICIENT_PERMISSIONS: "You do not have permission for this action",
  PLAN_LIMIT_EXCEEDED: "You have exceeded your plan limit",
} as const;

// ============================================================================
// SPECIAL DATES (HOLIDAYS)
// ============================================================================
export const FEDERAL_HOLIDAYS = [
  { month: 1, day: 1, name: "New Year's Day" },
  { month: 1, day: 19, name: "MLK Jr. Day" }, // Third Monday
  { month: 2, day: 19, name: "Presidents Day" }, // Third Monday
  { month: 3, day: 17, name: "St. Patrick's Day" },
  { month: 5, day: 27, name: "Memorial Day" }, // Last Monday
  { month: 7, day: 4, name: "Independence Day" },
  { month: 9, day: 2, name: "Labor Day" }, // First Monday
  { month: 10, day: 14, name: "Columbus Day" }, // Second Monday
  { month: 11, day: 11, name: "Veterans Day" },
  { month: 11, day: 28, name: "Thanksgiving" }, // Fourth Thursday
  { month: 12, day: 25, name: "Christmas" },
] as const;

// ============================================================================
// API LIMITS & TIMEOUTS
// ============================================================================
export const API_LIMITS = {
  MAX_MENU_ITEMS: 1000,
  MAX_CATEGORIES: 100,
  MAX_USERS_PER_TENANT: 50,
  MAX_IMAGE_SIZE_MB: 10,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_NAME_LENGTH: 100,
  REQUEST_TIMEOUT_MS: 30000,
  SESSION_EXPIRY_DAYS: 30,
  OTP_EXPIRY_MINUTES: 10,
  MAGIC_LINK_EXPIRY_MINUTES: 15,
} as const;

// ============================================================================
// CLOUDFLARE SPECIFIC
// ============================================================================
export const CLOUDFLARE_CONFIG = {
  WORKERS_AI_MODELS: {
    LLAMA_3: "@cf/meta/llama-3-8b-instruct",
    WHISPER: "@cf/openai/whisper",
  },
  IMAGES_VARIANTS: {
    AVATAR: "avatar",
    THUMBNAIL: "thumbnail",
    BANNER: "banner",
  },
  KV_CACHE_TTL: {
    TENANT_MAPPING: 3600, // 1 hour
    MENU_JSON: 300, // 5 minutes
    THEME_CONFIG: 3600, // 1 hour
    SESSIONS: 86400, // 24 hours
  },
} as const;

// ============================================================================
// REGEX PATTERNS
// ============================================================================
export const PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_US: /^\+?1?\d{10,14}$/,
  HEX_COLOR: /^#[0-9A-Fa-f]{6}$/,
  TIME_24H: /^([01]\d|2[0-3]):([0-5]\d)$/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  URL: /^https?:\/\/.+/,
} as const;

// ============================================================================
// NOTIFICATION PREFERENCES
// ============================================================================
export const NOTIFICATION_CHANNELS = [
  "sms",
  "email",
  "in_app",
] as const;

export const NOTIFICATION_TYPES = [
  "reviews",
  "orders",
  "system_alerts",
  "marketing",
  "analytics_reports",
] as const;

// ============================================================================
// FEATURE FLAGS
// ============================================================================
export const FEATURE_FLAGS = {
  AI_DESCRIPTIONS: true,
  VOICE_ORDERING: false,
  SOCIAL_SYNC: true,
  DELIVERY_INTEGRATION: false,
  LOYALTY_PROGRAM: false,
  ONLINE_ORDERING: false,
} as const;

// ============================================================================
// SERVER PORTS (Local Development)
// ============================================================================
export const PORTS = {
  public: 3000,
  store: 3001,
  admin: 3002,
  agent: 8787,
  jobs: 8788,
} as const;

