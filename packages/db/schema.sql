-- TENANTS & CONFIG
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE,
  custom_domain TEXT UNIQUE,
  business_name TEXT,
  google_place_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'trial',
  version_channel TEXT DEFAULT 'stable',
  status TEXT DEFAULT 'building',
  email_alias TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME
);

-- THEME CONFIG
CREATE TABLE IF NOT EXISTS theme_config (
  tenant_id TEXT PRIMARY KEY,
  primary_color TEXT,
  secondary_color TEXT,
  font_heading TEXT,
  font_body TEXT,
  layout_style TEXT,
  logo_image_cf_id TEXT,
  hero_image_cf_id TEXT,
  custom_css TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- AUTH & USERS
CREATE TABLE IF NOT EXISTS authorized_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT,
  phone_number TEXT,
  email TEXT,
  name TEXT,
  role TEXT,
  permissions TEXT,
  notification_preferences TEXT,
  security_challenge_code TEXT,
  last_login DATETIME,
  deleted_at DATETIME,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- BUSINESS SETTINGS
CREATE TABLE IF NOT EXISTS business_settings (
  tenant_id TEXT PRIMARY KEY,
  address TEXT,
  phone_public TEXT,
  timezone TEXT DEFAULT 'America/New_York',
  is_hiring INTEGER DEFAULT 0,
  marketing_pixels TEXT,
  emergency_close_reason TEXT,
  emergency_reopen_time DATETIME,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- OPERATING HOURS
CREATE TABLE IF NOT EXISTS operating_hours (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT,
  day_of_week INTEGER,
  start_time TEXT,
  end_time TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- SPECIAL DATES
CREATE TABLE IF NOT EXISTS special_dates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT,
  date_iso TEXT,
  status TEXT,
  reason TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT,
  name TEXT,
  sort_order INTEGER,
  is_visible INTEGER DEFAULT 1,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- MENU ITEMS
CREATE TABLE IF NOT EXISTS menu_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT,
  category_id INTEGER,
  name TEXT,
  description TEXT,
  price REAL,
  image_cf_id TEXT,
  is_available INTEGER DEFAULT 1,
  dietary_tags TEXT,
  dietary_tags_verified INTEGER DEFAULT 0,
  sentiment_score REAL,
  is_highlighted INTEGER DEFAULT 0,
  embedding_version INTEGER,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- SUBSCRIPTION EVENTS (for Stripe webhook tracking)
CREATE TABLE IF NOT EXISTS subscription_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  stripe_event_id TEXT UNIQUE,
  previous_status TEXT,
  new_status TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- A2P 10DLC PROFILES (for Twilio SMS compliance)
CREATE TABLE IF NOT EXISTS a2p_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT UNIQUE NOT NULL,
  business_profile_sid TEXT,
  campaign_sid TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);
