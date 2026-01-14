-- Migration: 0001_init_schema
-- Description: Initialize Diner SaaS database schema
-- Created: 2026-01-13

-- TENANTS & CONFIG
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  customDomain TEXT UNIQUE,
  businessName TEXT NOT NULL,
  googlePlaceId TEXT,
  stripeSubscriptionId TEXT,
  subscriptionStatus TEXT NOT NULL DEFAULT 'trial',
  versionChannel TEXT NOT NULL DEFAULT 'stable',
  status TEXT NOT NULL DEFAULT 'building',
  emailAlias TEXT,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deletedAt TEXT
);

-- THEME CONFIG
CREATE TABLE IF NOT EXISTS theme_config (
  tenantId TEXT PRIMARY KEY,
  primaryColor TEXT DEFAULT '#dc2626',
  secondaryColor TEXT DEFAULT '#f3f4f6',
  fontHeading TEXT DEFAULT 'sans-serif',
  fontBody TEXT DEFAULT 'sans-serif',
  layoutStyle TEXT DEFAULT 'grid',
  logoImageCfId TEXT,
  heroImageCfId TEXT,
  customCss TEXT,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
);

-- BUSINESS SETTINGS
CREATE TABLE IF NOT EXISTS business_settings (
  tenantId TEXT PRIMARY KEY,
  address TEXT,
  phonePublic TEXT,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  isHiring INTEGER NOT NULL DEFAULT 0,
  marketingPixels TEXT,
  emergencyCloseReason TEXT,
  emergencyReopenTime TEXT,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
);

-- AUTH & USERS
CREATE TABLE IF NOT EXISTS authorized_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenantId TEXT NOT NULL,
  phoneNumber TEXT,
  email TEXT,
  name TEXT,
  role TEXT,
  permissions TEXT,
  notificationPreferences TEXT,
  securityChallengeCode TEXT,
  lastLogin TEXT,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deletedAt TEXT,
  FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE(tenantId, email),
  UNIQUE(tenantId, phoneNumber)
);

-- OPERATING HOURS
CREATE TABLE IF NOT EXISTS operating_hours (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenantId TEXT NOT NULL,
  dayOfWeek INTEGER NOT NULL,
  startTime TEXT NOT NULL,
  endTime TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
);

-- SPECIAL DATES
CREATE TABLE IF NOT EXISTS special_dates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenantId TEXT NOT NULL,
  dateIso TEXT NOT NULL,
  status TEXT NOT NULL,
  reason TEXT,
  customStartTime TEXT,
  customEndTime TEXT,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
);

-- CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenantId TEXT NOT NULL,
  name TEXT NOT NULL,
  sortOrder INTEGER,
  isVisible INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
);

-- MENU ITEMS
CREATE TABLE IF NOT EXISTS menu_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenantId TEXT NOT NULL,
  categoryId INTEGER,
  name TEXT NOT NULL,
  description TEXT,
  price REAL,
  imageCfId TEXT,
  isAvailable INTEGER NOT NULL DEFAULT 1,
  dietaryTags TEXT,
  dietaryTagsVerified INTEGER NOT NULL DEFAULT 0,
  sentimentScore REAL DEFAULT 0.5,
  isHighlighted INTEGER NOT NULL DEFAULT 0,
  embeddingVersion INTEGER NOT NULL DEFAULT 0,
  lastUpdatedBy TEXT,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deletedAt TEXT,
  FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE CASCADE
);

-- SESSIONS
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  userId INTEGER,
  tenantId TEXT NOT NULL,
  expiresAt TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES authorized_users(id) ON DELETE CASCADE,
  FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
);

-- HOST MAPPING
CREATE TABLE IF NOT EXISTS host_mapping (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenantId TEXT NOT NULL UNIQUE,
  host TEXT NOT NULL UNIQUE,
  isPrimary INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_menu_items_tenant ON menu_items(tenantId);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(categoryId);
CREATE INDEX IF NOT EXISTS idx_categories_tenant ON categories(tenantId);
CREATE INDEX IF NOT EXISTS idx_operating_hours_tenant_day ON operating_hours(tenantId, dayOfWeek);
CREATE INDEX IF NOT EXISTS idx_special_dates_tenant ON special_dates(tenantId);
CREATE INDEX IF NOT EXISTS idx_special_dates_date ON special_dates(dateIso);
CREATE INDEX IF NOT EXISTS idx_authorized_users_tenant ON authorized_users(tenantId);
CREATE INDEX IF NOT EXISTS idx_authorized_users_email ON authorized_users(email);
CREATE INDEX IF NOT EXISTS idx_authorized_users_phone ON authorized_users(phoneNumber);
CREATE INDEX IF NOT EXISTS idx_sessions_tenant ON sessions(tenantId);
CREATE INDEX IF NOT EXISTS idx_host_mapping_host ON host_mapping(host);
