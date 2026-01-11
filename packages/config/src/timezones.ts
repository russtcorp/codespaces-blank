/**
 * Supported timezones for diner operations
 * Critical for accurate hours logic and scheduling
 */
export const SUPPORTED_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Phoenix',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
] as const;

export type SupportedTimezone = (typeof SUPPORTED_TIMEZONES)[number];

/**
 * Default timezone if not specified
 */
export const DEFAULT_TIMEZONE: SupportedTimezone = 'America/New_York';
