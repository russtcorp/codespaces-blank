import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// TENANTS & CONFIG
export const tenants = sqliteTable("tenants", {
  id: text("id").primaryKey(),
  slug: text("slug").unique(),
  customDomain: text("custom_domain").unique(),
  businessName: text("business_name"),
  googlePlaceId: text("google_place_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status").default("trial"),
  versionChannel: text("version_channel").default("stable"),
  status: text("status").default("building"),
  emailAlias: text("email_alias"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  deletedAt: text("deleted_at"),
});

// THEME CONFIG
export const themeConfig = sqliteTable("theme_config", {
  tenantId: text("tenant_id").primaryKey().references(() => tenants.id),
  primaryColor: text("primary_color"),
  secondaryColor: text("secondary_color"),
  fontHeading: text("font_heading"),
  fontBody: text("font_body"),
  layoutStyle: text("layout_style"),
  logoImageCfId: text("logo_image_cf_id"),
  heroImageCfId: text("hero_image_cf_id"),
  customCss: text("custom_css"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// AUTH & USERS
export const authorizedUsers = sqliteTable("authorized_users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenant_id").references(() => tenants.id),
  phoneNumber: text("phone_number"),
  email: text("email"),
  name: text("name"),
  role: text("role"),
  permissions: text("permissions"),
  notificationPreferences: text("notification_preferences"),
  securityChallengeCode: text("security_challenge_code"),
  lastLogin: text("last_login"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  deletedAt: text("deleted_at"),
}, (table) => ({
  tenantIdx: index("authorized_users_tenant_idx").on(table.tenantId),
}));

// BUSINESS SETTINGS
export const businessSettings = sqliteTable("business_settings", {
  tenantId: text("tenant_id").primaryKey().references(() => tenants.id),
  address: text("address"),
  phonePublic: text("phone_public"),
  timezone: text("timezone").default("America/New_York"),
  isHiring: integer("is_hiring", { mode: "boolean" }).default(false),
  marketingPixels: text("marketing_pixels"),
  emergencyCloseReason: text("emergency_close_reason"),
  emergencyReopenTime: text("emergency_reopen_time"),
  // Phase 5: QR Flyer requires WiFi credentials
  wifiSsid: text("wifi_ssid"),
  wifiPassword: text("wifi_password"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// OPERATING HOURS
export const operatingHours = sqliteTable("operating_hours", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenant_id").references(() => tenants.id),
  dayOfWeek: integer("day_of_week"),
  startTime: text("start_time"),
  endTime: text("end_time"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  tenantIdx: index("operating_hours_tenant_idx").on(table.tenantId),
}));

// SPECIAL DATES
export const specialDates = sqliteTable("special_dates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenant_id").references(() => tenants.id),
  dateIso: text("date_iso"),
  status: text("status"),
  reason: text("reason"),
  customStartTime: text("custom_start_time"),
  customEndTime: text("custom_end_time"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  tenantIdx: index("special_dates_tenant_idx").on(table.tenantId),
}));

// CATEGORIES
export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenant_id").references(() => tenants.id),
  name: text("name"),
  sortOrder: integer("sort_order"),
  isVisible: integer("is_visible", { mode: "boolean" }).default(true),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  tenantIdx: index("categories_tenant_idx").on(table.tenantId),
}));

// MENU ITEMS
export const menuItems = sqliteTable("menu_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenant_id").references(() => tenants.id),
  categoryId: integer("category_id").references(() => categories.id),
  name: text("name"),
  description: text("description"),
  price: real("price"),
  imageCfId: text("image_cf_id"),
  isAvailable: integer("is_available", { mode: "boolean" }).default(true),
  dietaryTags: text("dietary_tags"),
  dietaryTagsVerified: integer("dietary_tags_verified", { mode: "boolean" }).default(false),
  sentimentScore: real("sentiment_score"),
  isHighlighted: integer("is_highlighted", { mode: "boolean" }).default(false),
  embeddingVersion: integer("embedding_version").default(0),
  lastUpdatedBy: text("last_updated_by"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
  deletedAt: text("deleted_at"),
}, (table) => ({
  tenantIdx: index("menu_items_tenant_idx").on(table.tenantId),
  categoryIdx: index("menu_items_category_idx").on(table.categoryId),
}));

// SESSIONS
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id").references(() => authorizedUsers.id, {
    onDelete: "cascade",
  }),
  tenantId: text("tenant_id").references(() => tenants.id, {
    onDelete: "cascade",
  }),
  expiresAt: text("expires_at"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// TENANT HOST MAPPING
export const hostMapping = sqliteTable("host_mapping", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenant_id")
    .references(() => tenants.id, { onDelete: "cascade" })
    .unique(),
  host: text("host").unique(),
  isPrimary: integer("is_primary", { mode: "boolean" }).default(false),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// SOCIAL POSTS
export const socialPosts = sqliteTable("social_posts", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id),
  platform: text("platform"),
  externalId: text("external_id"),
  caption: text("caption"),
  mediaUrl: text("media_url"),
  permalink: text("permalink"),
  thumbnailUrl: text("thumbnail_url"),
  postedAt: text("posted_at"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  tenantIdx: index("social_posts_tenant_idx").on(table.tenantId),
}));

// REVIEWS
export const reviews = sqliteTable("reviews", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenant_id").references(() => tenants.id),
  platform: text("platform"),
  externalId: text("external_id"),
  reviewerName: text("reviewer_name"),
  rating: integer("rating"),
  content: text("content"),
  aiDraftResponse: text("ai_draft_response"),
  status: text("status").default("new"),
  postedAt: text("posted_at"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  tenantIdx: index("reviews_tenant_idx").on(table.tenantId),
}));

// SUBSCRIPTION EVENTS
export const subscriptionEvents = sqliteTable("subscription_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenant_id").references(() => tenants.id),
  eventType: text("event_type").notNull(),
  stripeEventId: text("stripe_event_id"),
  previousStatus: text("previous_status"),
  newStatus: text("new_status"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});
