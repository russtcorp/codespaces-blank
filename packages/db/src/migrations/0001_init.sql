-- Initial schema for D1 (Phase 2)
-- Tenants
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  custom_domain TEXT UNIQUE,
  business_name TEXT NOT NULL,
  google_place_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT NOT NULL DEFAULT 'trial',
  version_channel TEXT NOT NULL DEFAULT 'stable',
  status TEXT NOT NULL DEFAULT 'building',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

-- Theme configuration
CREATE TABLE IF NOT EXISTS theme_config (
  tenant_id TEXT PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  primary_color TEXT,
  secondary_color TEXT,
  font_heading TEXT,
  font_body TEXT,
  layout_style TEXT DEFAULT 'grid',
  logo_url TEXT,
  hero_image_url TEXT,
  custom_css TEXT
);

-- Authorized users
CREATE TABLE IF NOT EXISTS authorized_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone_number TEXT,
  email TEXT,
  name TEXT,
  role TEXT NOT NULL,
  permissions TEXT,
  notification_preferences TEXT,
  security_challenge_code TEXT,
  last_login TEXT,
  deleted_at TEXT
);

-- Business info
CREATE TABLE IF NOT EXISTS business_info (
  tenant_id TEXT PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  address TEXT,
  phone_public TEXT,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  is_hiring INTEGER NOT NULL DEFAULT 0,
  marketing_pixels TEXT
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible INTEGER NOT NULL DEFAULT 1
);

-- Menu items
CREATE TABLE IF NOT EXISTS menu_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  image_url TEXT,
  is_available INTEGER NOT NULL DEFAULT 1,
  dietary_tags TEXT,
  dietary_tags_verified INTEGER NOT NULL DEFAULT 0,
  sentiment_score REAL,
  is_highlighted INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT
);

-- Operating hours
CREATE TABLE IF NOT EXISTS operating_hours (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL
);

-- Special dates
CREATE TABLE IF NOT EXISTS special_dates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  date_iso TEXT NOT NULL,
  status TEXT NOT NULL,
  reason TEXT
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_categories_tenant ON categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_tenant ON menu_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_operating_hours_tenant ON operating_hours(tenant_id);
CREATE INDEX IF NOT EXISTS idx_special_dates_tenant ON special_dates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_authorized_users_tenant ON authorized_users(tenant_id);
