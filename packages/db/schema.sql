-- TENANTS & CONFIG
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE,
  customDomain TEXT UNIQUE,
  businessName TEXT,
  googlePlaceId TEXT,
  stripeSubscriptionId TEXT,
  subscriptionStatus TEXT DEFAULT 'trial',
  versionChannel TEXT DEFAULT 'stable',
  status TEXT DEFAULT 'building',
  emailAlias TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deletedAt DATETIME
);

-- THEME CONFIG
CREATE TABLE IF NOT EXISTS theme_config (
  tenantId TEXT PRIMARY KEY,
  primaryColor TEXT,
  secondaryColor TEXT,
  fontHeading TEXT,
  fontBody TEXT,
  layoutStyle TEXT,
  logoImageCfId TEXT,
  heroImageCfId TEXT,
  customCss TEXT,
  FOREIGN KEY (tenantId) REFERENCES tenants(id)
);

-- AUTH & USERS
CREATE TABLE IF NOT EXISTS authorized_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenantId TEXT,
  phoneNumber TEXT,
  email TEXT,
  name TEXT,
  role TEXT,
  permissions TEXT,
  notificationPreferences TEXT,
  securityChallengeCode TEXT,
  lastLogin DATETIME,
  deletedAt DATETIME,
  FOREIGN KEY (tenantId) REFERENCES tenants(id)
);

-- BUSINESS SETTINGS
CREATE TABLE IF NOT EXISTS business_settings (
  tenantId TEXT PRIMARY KEY,
  address TEXT,
  phonePublic TEXT,
  timezone TEXT DEFAULT 'America/New_York',
  isHiring INTEGER DEFAULT 0,
  marketingPixels TEXT,
  emergencyCloseReason TEXT,
  emergencyReopenTime DATETIME,
  FOREIGN KEY (tenantId) REFERENCES tenants(id)
);

-- OPERATING HOURS
CREATE TABLE IF NOT EXISTS operating_hours (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenantId TEXT,
  dayOfWeek INTEGER,
  startTime TEXT,
  endTime TEXT,
  FOREIGN KEY (tenantId) REFERENCES tenants(id)
);

-- SPECIAL DATES
CREATE TABLE IF NOT EXISTS special_dates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenantId TEXT,
  dateIso TEXT,
  status TEXT,
  reason TEXT,
  FOREIGN KEY (tenantId) REFERENCES tenants(id)
);

-- CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenantId TEXT,
  name TEXT,
  sortOrder INTEGER,
  isVisible INTEGER DEFAULT 1,
  FOREIGN KEY (tenantId) REFERENCES tenants(id)
);

-- MENU ITEMS
CREATE TABLE IF NOT EXISTS menu_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenantId TEXT,
  categoryId INTEGER,
  name TEXT,
  description TEXT,
  price REAL,
  imageCfId TEXT,
  isAvailable INTEGER DEFAULT 1,
  dietaryTags TEXT,
  dietaryTagsVerified INTEGER DEFAULT 0,
  sentimentScore REAL,
  isHighlighted INTEGER DEFAULT 0,
  embeddingVersion INTEGER,
  FOREIGN KEY (tenantId) REFERENCES tenants(id),
  FOREIGN KEY (categoryId) REFERENCES categories(id)
);

-- SUBSCRIPTION EVENTS (for Stripe webhook tracking)
CREATE TABLE IF NOT EXISTS subscription_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenantId TEXT NOT NULL,
  eventType TEXT NOT NULL,
  stripeEventId TEXT UNIQUE,
  previousStatus TEXT,
  newStatus TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenantId) REFERENCES tenants(id)
);

-- A2P 10DLC PROFILES (for Twilio SMS compliance)
CREATE TABLE IF NOT EXISTS a2p_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenantId TEXT UNIQUE NOT NULL,
  businessProfileSid TEXT,
  campaignSid TEXT,
  status TEXT DEFAULT 'pending',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP,
  FOREIGN KEY (tenantId) REFERENCES tenants(id)
);
