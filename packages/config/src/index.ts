// Timezones
export * from './timezones';

// Plans & Billing
export * from './plans';

// Permissions & Roles
export * from './permissions';

// Tenants
export * from './tenants';

// Operating Hours
export * from './hours';

// Menu Items
export * from './menu';

/**
 * Application-wide constants
 */
export const APP_NAME = 'Diner SaaS' as const;
export const APP_VERSION = '1.0.0' as const;

/**
 * Rate limiting defaults
 */
export const RATE_LIMITS = {
  API_DEFAULT: 100, // requests per minute
  AUTH_ATTEMPTS: 5, // login attempts per 15 minutes
  IMAGE_UPLOAD: 10, // uploads per hour
  AI_REQUESTS: 20, // AI requests per minute
} as const;

/**
 * Cache TTLs (in seconds)
 */
export const CACHE_TTL = {
  TENANT_DOMAIN: 3600, // 1 hour
  MENU_DATA: 300, // 5 minutes
  THEME_CONFIG: 1800, // 30 minutes
  STATIC_ASSETS: 86400, // 24 hours
} as const;

/**
 * Cloudflare Workers limits and timeouts
 */
export const WORKER_LIMITS = {
  CPU_TIME_MS: 50, // CPU time per request
  RESPONSE_TIMEOUT_MS: 30000, // 30 seconds
  SUBREQUEST_LIMIT: 50,
} as const;
