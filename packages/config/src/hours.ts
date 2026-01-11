/**
 * Days of the week (0-6, Sunday-Saturday)
 * Matching JavaScript Date.getDay() convention
 */
export const DAYS_OF_WEEK = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
} as const;

export type DayOfWeek = (typeof DAYS_OF_WEEK)[keyof typeof DAYS_OF_WEEK];

/**
 * Day names for display
 */
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

/**
 * Special date status types
 */
export const SPECIAL_DATE_STATUS = {
  CLOSED: 'closed',
  OPEN: 'open',
  LIMITED: 'limited', // Custom hours for this date
} as const;

export type SpecialDateStatus = (typeof SPECIAL_DATE_STATUS)[keyof typeof SPECIAL_DATE_STATUS];

/**
 * Common US holidays (for quick reference)
 */
export const US_FEDERAL_HOLIDAYS = [
  { name: "New Year's Day", date: '01-01' },
  { name: 'Martin Luther King Jr. Day', date: 'third-monday-january' },
  { name: "Presidents' Day", date: 'third-monday-february' },
  { name: 'Memorial Day', date: 'last-monday-may' },
  { name: 'Juneteenth', date: '06-19' },
  { name: 'Independence Day', date: '07-04' },
  { name: 'Labor Day', date: 'first-monday-september' },
  { name: 'Columbus Day', date: 'second-monday-october' },
  { name: 'Veterans Day', date: '11-11' },
  { name: 'Thanksgiving', date: 'fourth-thursday-november' },
  { name: 'Christmas', date: '12-25' },
] as const;
