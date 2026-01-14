-- Seed Script: Joes Diner Test Data
-- Created: 2026-01-13

-- 1. Insert Tenant
INSERT INTO tenants (id, slug, businessName, subscriptionStatus, status, createdAt)
VALUES (
  'joes-diner-001',
  'joes-diner',
  'Joes Diner',
  'trial',
  'active',
  datetime('now')
);

-- 2. Insert Business Settings
INSERT INTO business_settings (tenantId, address, phonePublic, timezone, isHiring, createdAt, updatedAt)
VALUES (
  'joes-diner-001',
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
  'joes-diner-001',
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
  'joes-diner-001',
  'joe@example.com',
  '+1555123456',
  'Joe Owner',
  'owner',
  '["menu_full", "hours_edit", "analytics_view", "settings_edit", "users_manage", "billing_view"]',
  datetime('now')
);

-- 5. Insert Operating Hours (Mon-Fri: 6am-10pm, Sat-Sun: 8am-10pm)
INSERT INTO operating_hours (tenantId, dayOfWeek, startTime, endTime, createdAt)
VALUES
  ('joes-diner-001', 1, '06:00', '22:00', datetime('now')),
  ('joes-diner-001', 2, '06:00', '22:00', datetime('now')),
  ('joes-diner-001', 3, '06:00', '22:00', datetime('now')),
  ('joes-diner-001', 4, '06:00', '22:00', datetime('now')),
  ('joes-diner-001', 5, '06:00', '22:00', datetime('now')),
  ('joes-diner-001', 6, '08:00', '22:00', datetime('now')),
  ('joes-diner-001', 0, '08:00', '22:00', datetime('now'));

-- 6. Insert Menu Categories
INSERT INTO categories (tenantId, name, sortOrder, isVisible, createdAt, updatedAt)
VALUES
  ('joes-diner-001', 'Breakfast', 1, 1, datetime('now'), datetime('now')),
  ('joes-diner-001', 'Main Courses', 2, 1, datetime('now'), datetime('now')),
  ('joes-diner-001', 'Sides', 3, 1, datetime('now'), datetime('now'));

-- 7. Insert Menu Items (5 sample items)
INSERT INTO menu_items (tenantId, categoryId, name, description, price, isAvailable, dietaryTags, dietaryTagsVerified, sentimentScore, isHighlighted, createdAt, updatedAt)
VALUES
  (
    'joes-diner-001',
    (SELECT id FROM categories WHERE tenantId = 'joes-diner-001' AND name = 'Breakfast'),
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
    'joes-diner-001',
    (SELECT id FROM categories WHERE tenantId = 'joes-diner-001' AND name = 'Main Courses'),
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
    'joes-diner-001',
    (SELECT id FROM categories WHERE tenantId = 'joes-diner-001' AND name = 'Main Courses'),
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
    'joes-diner-001',
    (SELECT id FROM categories WHERE tenantId = 'joes-diner-001' AND name = 'Main Courses'),
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
    'joes-diner-001',
    (SELECT id FROM categories WHERE tenantId = 'joes-diner-001' AND name = 'Sides'),
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
VALUES ('joes-diner-001', 'joes-diner.localhost', 1, datetime('now'));
