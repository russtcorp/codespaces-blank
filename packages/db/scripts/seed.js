#!/usr/bin/env node

/**
 * Database Seeding Script
 *
 * Generates SQL seed data for Joe's Diner test tenant.
 * Usage: node scripts/seed.js
 * Then apply with: sqlite3 .wrangler/state/v3/d1/local-dev.db < migrations/0002_seed_dev_data.sql
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration for Joe's Diner
const TENANT_ID = "joes-diner-001";
const TENANT_SLUG = "joes-diner";
const TENANT_NAME = "Joes Diner";
const OWNER_EMAIL = "joe@example.com";
const OWNER_PHONE = "+1555123456";

// SQL INSERT statements
const seedSQL = `-- Seed Script: Joes Diner Test Data
-- Created: 2026-01-13

-- 1. Insert Tenant
INSERT INTO tenants (id, slug, businessName, subscriptionStatus, status, createdAt)
VALUES (
  '${TENANT_ID}',
  '${TENANT_SLUG}',
  '${TENANT_NAME}',
  'trial',
  'active',
  datetime('now')
);

-- 2. Insert Business Settings
INSERT INTO business_settings (tenantId, address, phonePublic, timezone, isHiring, createdAt, updatedAt)
VALUES (
  '${TENANT_ID}',
  '123 Main Street, Springfield, IL 62701',
  '+1-555-123-4567',
  'America/Chicago',
  0,
  datetime('now'),
  datetime('now')
);

-- 3. Insert Theme Config
INSERT INTO theme_config (tenantId, primaryColor, secondaryColor, fontHeading, fontBody, createdAt, updatedAt)
VALUES (
  '${TENANT_ID}',
  '#dc2626',
  '#f3f4f6',
  'Georgia',
  'Helvetica',
  datetime('now'),
  datetime('now')
);

-- 4. Insert Authorized User (Owner)
INSERT INTO authorized_users (tenantId, email, phoneNumber, name, role, permissions, createdAt)
VALUES (
  '${TENANT_ID}',
  '${OWNER_EMAIL}',
  '${OWNER_PHONE}',
  'Joe Owner',
  'owner',
  '["menu_full", "hours_edit", "analytics_view", "settings_edit", "users_manage", "billing_view"]',
  datetime('now')
);

-- 5. Insert Operating Hours (Mon-Fri: 6am-10pm, Sat-Sun: 8am-10pm)
INSERT INTO operating_hours (tenantId, dayOfWeek, startTime, endTime, createdAt)
VALUES
  ('${TENANT_ID}', 1, '06:00', '22:00', datetime('now')),
  ('${TENANT_ID}', 2, '06:00', '22:00', datetime('now')),
  ('${TENANT_ID}', 3, '06:00', '22:00', datetime('now')),
  ('${TENANT_ID}', 4, '06:00', '22:00', datetime('now')),
  ('${TENANT_ID}', 5, '06:00', '22:00', datetime('now')),
  ('${TENANT_ID}', 6, '08:00', '22:00', datetime('now')),
  ('${TENANT_ID}', 0, '08:00', '22:00', datetime('now'));

-- 6. Insert Menu Categories
INSERT INTO categories (tenantId, name, sortOrder, isVisible, createdAt, updatedAt)
VALUES
  ('${TENANT_ID}', 'Breakfast', 1, 1, datetime('now'), datetime('now')),
  ('${TENANT_ID}', 'Main Courses', 2, 1, datetime('now'), datetime('now')),
  ('${TENANT_ID}', 'Sides', 3, 1, datetime('now'), datetime('now'));

-- 7. Insert Menu Items (5 sample items)
INSERT INTO menu_items (tenantId, categoryId, name, description, price, isAvailable, dietaryTags, dietaryTagsVerified, sentimentScore, isHighlighted, createdAt, updatedAt)
VALUES
  (
    '${TENANT_ID}',
    (SELECT id FROM categories WHERE tenantId = '${TENANT_ID}' AND name = 'Breakfast'),
    'Classic Pancakes',
    'Fluffy pancakes served with butter and maple syrup. Add blueberries or chocolate chips for $1.50',
    8.99,
    1,
    '["V"]',
    1,
    0.85,
    1,
    datetime('now'),
    datetime('now')
  ),
  (
    '${TENANT_ID}',
    (SELECT id FROM categories WHERE tenantId = '${TENANT_ID}' AND name = 'Main Courses'),
    'Famous Meatloaf',
    'House-made meatloaf with a special sauce, served with mashed potatoes and green beans',
    12.99,
    1,
    '[]',
    0,
    0.92,
    1,
    datetime('now'),
    datetime('now')
  ),
  (
    '${TENANT_ID}',
    (SELECT id FROM categories WHERE tenantId = '${TENANT_ID}' AND name = 'Main Courses'),
    'Grilled Chicken Sandwich',
    'Seasoned grilled chicken breast on a fresh bun with lettuce, tomato, and our special sauce',
    10.49,
    1,
    '["GF"]',
    0,
    0.88,
    0,
    datetime('now'),
    datetime('now')
  ),
  (
    '${TENANT_ID}',
    (SELECT id FROM categories WHERE tenantId = '${TENANT_ID}' AND name = 'Main Courses'),
    'Ribeye Steak',
    '12 oz premium ribeye steak, grilled to your preference, served with your choice of two sides',
    18.99,
    1,
    '[]',
    0,
    0.95,
    0,
    datetime('now'),
    datetime('now')
  ),
  (
    '${TENANT_ID}',
    (SELECT id FROM categories WHERE tenantId = '${TENANT_ID}' AND name = 'Sides'),
    'Homemade Mac & Cheese',
    'Creamy four-cheese blend with fresh pasta, baked until golden',
    4.99,
    1,
    '["V"]',
    1,
    0.91,
    0,
    datetime('now'),
    datetime('now')
  );

-- 8. Insert Host Mapping
INSERT INTO host_mapping (tenantId, host, isPrimary, createdAt)
VALUES ('${TENANT_ID}', 'joes-diner.localhost', 1, datetime('now'));
`;

console.log("🌱 Diner SaaS Database Seeding Script\n");
console.log("📝 Generating seed data...\n");

const seedFilePath = path.join(__dirname, "../migrations/0002_seed_dev_data.sql");
try {
  fs.writeFileSync(seedFilePath, seedSQL, "utf8");
  console.log(`✅ Seed SQL generated: ${seedFilePath}\n`);
  console.log("📋 Data to be created:");
  console.log(`  • Tenant: ${TENANT_NAME} (${TENANT_ID})`);
  console.log(`  • Owner: Joe Owner (${OWNER_EMAIL})`);
  console.log("  • 5 menu items across 3 categories");
  console.log("  • Operating hours: Mon-Fri 6am-10pm, Sat-Sun 8am-10pm\n");
  console.log("⏭️  Next, apply the seed data with:");
  console.log("  sqlite3 .wrangler/state/v3/d1/local-dev.db < packages/db/migrations/0002_seed_dev_data.sql\n");
} catch (error) {
  console.error(`❌ Failed to write seed file: ${error}`);
  process.exit(1);
}
