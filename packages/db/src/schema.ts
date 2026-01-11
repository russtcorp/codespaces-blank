import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

/**
 * TENANTS & CONFIGURATION
 */

export const tenants = sqliteTable('tenants', {
  id: text('id').primaryKey(),
  slug: text('slug').unique().notNull(),
  customDomain: text('custom_domain').unique(),
  businessName: text('business_name').notNull(),
  googlePlaceId: text('google_place_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  subscriptionStatus: text('subscription_status').default('trial').notNull(),
  versionChannel: text('version_channel').default('stable').notNull(),
  status: text('status').default('building').notNull(),
  createdAt: text('created_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  deletedAt: text('deleted_at'), // Soft delete
});

export const themeConfig = sqliteTable('theme_config', {
  tenantId: text('tenant_id')
    .primaryKey()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  primaryColor: text('primary_color'),
  secondaryColor: text('secondary_color'),
  fontHeading: text('font_heading'),
  fontBody: text('font_body'),
  layoutStyle: text('layout_style').default('grid'),
  logoUrl: text('logo_url'),
  heroImageUrl: text('hero_image_url'),
  customCss: text('custom_css'),
});

/**
 * ACCESS & AUTH
 */

export const authorizedUsers = sqliteTable('authorized_users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  phoneNumber: text('phone_number'),
  email: text('email'),
  name: text('name'),
  role: text('role').notNull(), // 'owner', 'manager'
  permissions: text('permissions'), // JSON array
  notificationPreferences: text('notification_preferences'), // JSON object
  securityChallengeCode: text('security_challenge_code'),
  lastLogin: text('last_login'),
  deletedAt: text('deleted_at'), // Soft delete
});

export const businessInfo = sqliteTable('business_info', {
  tenantId: text('tenant_id')
    .primaryKey()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  address: text('address'),
  phonePublic: text('phone_public'),
  timezone: text('timezone').default('America/New_York').notNull(),
  isHiring: integer('is_hiring', { mode: 'boolean' }).default(false).notNull(),
  marketingPixels: text('marketing_pixels'), // JSON object
});

/**
 * MENU & AI DATA
 */

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  isVisible: integer('is_visible', { mode: 'boolean' }).default(true).notNull(),
});

export const menuItems = sqliteTable('menu_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  categoryId: integer('category_id')
    .notNull()
    .references(() => categories.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  price: real('price').notNull(),
  imageUrl: text('image_url'),
  isAvailable: integer('is_available', { mode: 'boolean' }).default(true).notNull(),
  dietaryTags: text('dietary_tags'), // JSON array
  dietaryTagsVerified: integer('dietary_tags_verified', { mode: 'boolean' })
    .default(false)
    .notNull(),
  sentimentScore: real('sentiment_score'),
  isHighlighted: integer('is_highlighted', { mode: 'boolean' }).default(false).notNull(),
  version: integer('version').default(1).notNull(), // Optimistic locking
  deletedAt: text('deleted_at'), // Soft delete
});

/**
 * RULES ENGINE
 */

export const operatingHours = sqliteTable('operating_hours', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  dayOfWeek: integer('day_of_week').notNull(), // 0-6
  startTime: text('start_time').notNull(), // "06:00"
  endTime: text('end_time').notNull(), // "14:00"
});

export const specialDates = sqliteTable('special_dates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  dateIso: text('date_iso').notNull(), // "2024-12-25"
  status: text('status').notNull(), // 'closed', 'open', 'limited'
  reason: text('reason'),
});

/**
 * Type inference helpers
 */
export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;

export type ThemeConfig = typeof themeConfig.$inferSelect;
export type NewThemeConfig = typeof themeConfig.$inferInsert;

export type AuthorizedUser = typeof authorizedUsers.$inferSelect;
export type NewAuthorizedUser = typeof authorizedUsers.$inferInsert;

export type BusinessInfo = typeof businessInfo.$inferSelect;
export type NewBusinessInfo = typeof businessInfo.$inferInsert;

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type MenuItem = typeof menuItems.$inferSelect;
export type NewMenuItem = typeof menuItems.$inferInsert;

export type OperatingHours = typeof operatingHours.$inferSelect;
export type NewOperatingHours = typeof operatingHours.$inferInsert;

export type SpecialDate = typeof specialDates.$inferSelect;
export type NewSpecialDate = typeof specialDates.$inferInsert;
