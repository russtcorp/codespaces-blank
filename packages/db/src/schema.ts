import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// TENANTS & CONFIG
export const tenants = sqliteTable("tenants", {
  id: text("id").primaryKey(),
  slug: text("slug").unique(),
  customDomain: text("customDomain").unique(),
  businessName: text("businessName"),
  googlePlaceId: text("googlePlaceId"),
  stripeSubscriptionId: text("stripeSubscriptionId"),
  subscriptionStatus: text("subscriptionStatus").default("trial"),
  versionChannel: text("versionChannel").default("stable"),
  status: text("status").default("building"),
  emailAlias: text("emailAlias"),
  createdAt: text("createdAt").default(sql`CURRENT_TIMESTAMP`),
  deletedAt: text("deletedAt"),
});

// THEME CONFIG
export const themeConfig = sqliteTable("theme_config", {
  tenantId: text("tenantId").primaryKey().references(() => tenants.id),
  primaryColor: text("primaryColor"),
  secondaryColor: text("secondaryColor"),
  fontHeading: text("fontHeading"),
  fontBody: text("fontBody"),
  layoutStyle: text("layoutStyle"),
  logoImageCfId: text("logoImageCfId"),
  heroImageCfId: text("heroImageCfId"),
  customCss: text("customCss"),
  createdAt: text("createdAt").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updatedAt").default(sql`CURRENT_TIMESTAMP`),
});

// AUTH & USERS
export const authorizedUsers = sqliteTable("authorized_users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenantId").references(() => tenants.id),
  phoneNumber: text("phoneNumber"),
  email: text("email"),
  name: text("name"),
  role: text("role"),
  permissions: text("permissions"),
  notificationPreferences: text("notificationPreferences"),
  securityChallengeCode: text("securityChallengeCode"),
  lastLogin: text("lastLogin"),
  createdAt: text("createdAt").default(sql`CURRENT_TIMESTAMP`),
  deletedAt: text("deletedAt"),
}, (table) => ({
  tenantIdx: index("authorized_users_tenant_idx").on(table.tenantId),
}));

// BUSINESS SETTINGS
export const businessSettings = sqliteTable("business_settings", {
  tenantId: text("tenantId").primaryKey().references(() => tenants.id),
  address: text("address"),
  phonePublic: text("phonePublic"),
  timezone: text("timezone").default("America/New_York"),
  isHiring: integer("isHiring", { mode: "boolean" }).default(false),
  marketingPixels: text("marketingPixels"),
  emergencyCloseReason: text("emergencyCloseReason"),
  emergencyReopenTime: text("emergencyReopenTime"),
  // Phase 5: QR Flyer requires WiFi credentials
  wifiSsid: text("wifiSsid"),
  wifiPassword: text("wifiPassword"),
  createdAt: text("createdAt").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updatedAt").default(sql`CURRENT_TIMESTAMP`),
});

// OPERATING HOURS
export const operatingHours = sqliteTable("operating_hours", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenantId").references(() => tenants.id),
  dayOfWeek: integer("dayOfWeek"),
  startTime: text("startTime"),
  endTime: text("endTime"),
  createdAt: text("createdAt").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  tenantIdx: index("operating_hours_tenant_idx").on(table.tenantId),
}));

// SPECIAL DATES
export const specialDates = sqliteTable("special_dates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenantId").references(() => tenants.id),
  dateIso: text("dateIso"),
  status: text("status"),
  reason: text("reason"),
  customStartTime: text("customStartTime"),
  customEndTime: text("customEndTime"),
  createdAt: text("createdAt").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updatedAt").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  tenantIdx: index("special_dates_tenant_idx").on(table.tenantId),
}));

// CATEGORIES
export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenantId").references(() => tenants.id),
  name: text("name"),
  sortOrder: integer("sortOrder"),
  isVisible: integer("isVisible", { mode: "boolean" }).default(true),
  createdAt: text("createdAt").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updatedAt").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  tenantIdx: index("categories_tenant_idx").on(table.tenantId),
}));

// MENU ITEMS
export const menuItems = sqliteTable("menu_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenantId").references(() => tenants.id),
  categoryId: integer("categoryId").references(() => categories.id),
  name: text("name"),
  description: text("description"),
  price: real("price"),
  imageCfId: text("imageCfId"),
  isAvailable: integer("isAvailable", { mode: "boolean" }).default(true),
  dietaryTags: text("dietaryTags"),
  dietaryTagsVerified: integer("dietaryTagsVerified", { mode: "boolean" }).default(false),
  sentimentScore: real("sentimentScore"),
  isHighlighted: integer("isHighlighted", { mode: "boolean" }).default(false),
  embeddingVersion: integer("embeddingVersion").default(0),
  lastUpdatedBy: text("lastUpdatedBy"),
  createdAt: text("createdAt").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updatedAt").default(sql`CURRENT_TIMESTAMP`),
  deletedAt: text("deletedAt"),
}, (table) => ({
  tenantIdx: index("menu_items_tenant_idx").on(table.tenantId),
  categoryIdx: index("menu_items_category_idx").on(table.categoryId),
}));

// SESSIONS
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: integer("userId").references(() => authorizedUsers.id, {
    onDelete: "cascade",
  }),
  tenantId: text("tenantId").references(() => tenants.id, {
    onDelete: "cascade",
  }),
  expiresAt: text("expiresAt"),
  createdAt: text("createdAt").default(sql`CURRENT_TIMESTAMP`),
});

// TENANT HOST MAPPING
export const hostMapping = sqliteTable("host_mapping", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenantId")
    .references(() => tenants.id, { onDelete: "cascade" })
    .unique(),
  host: text("host").unique(),
  isPrimary: integer("isPrimary", { mode: "boolean" }).default(false),
  createdAt: text("createdAt").default(sql`CURRENT_TIMESTAMP`),
});

// SOCIAL POSTS
export const socialPosts = sqliteTable("social_posts", {
  id: text("id").primaryKey(),
  tenantId: text("tenantId").references(() => tenants.id),
  platform: text("platform"),
  externalId: text("externalId"),
  caption: text("caption"),
  mediaUrl: text("mediaUrl"),
  permalink: text("permalink"),
  thumbnailUrl: text("thumbnailUrl"),
  postedAt: text("postedAt"),
  createdAt: text("createdAt").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  tenantIdx: index("social_posts_tenant_idx").on(table.tenantId),
}));

// REVIEWS
export const reviews = sqliteTable("reviews", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenantId").references(() => tenants.id),
  platform: text("platform"),
  externalId: text("externalId"),
  reviewerName: text("reviewerName"),
  rating: integer("rating"),
  content: text("content"),
  aiDraftResponse: text("aiDraftResponse"),
  status: text("status").default("new"),
  postedAt: text("postedAt"),
  createdAt: text("createdAt").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  tenantIdx: index("reviews_tenant_idx").on(table.tenantId),
}));

// SUBSCRIPTION EVENTS
export const subscriptionEvents = sqliteTable("subscription_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenantId").references(() => tenants.id),
  eventType: text("eventType").notNull(),
  stripeEventId: text("stripeEventId"),
  previousStatus: text("previousStatus"),
  newStatus: text("newStatus"),
  createdAt: text("createdAt").default(sql`CURRENT_TIMESTAMP`),
});
