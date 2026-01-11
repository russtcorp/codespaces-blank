-- Seed data for local development (Joe's Diner)
-- WARNING: intended for local/dev use. Adjust IDs before running in shared environments.

BEGIN TRANSACTION;

INSERT INTO tenants (id, slug, custom_domain, business_name, subscription_status, version_channel, status)
VALUES ('tenant-joes-diner', 'joes-diner', NULL, 'Joe''s Diner', 'trial', 'stable', 'active')
ON CONFLICT(id) DO NOTHING;

INSERT INTO theme_config (tenant_id, primary_color, secondary_color, font_heading, font_body, layout_style)
VALUES ('tenant-joes-diner', '#b22222', '#f8f4ec', 'Inter', 'Inter', 'grid')
ON CONFLICT(tenant_id) DO NOTHING;

INSERT INTO business_info (tenant_id, address, phone_public, timezone, is_hiring)
VALUES ('tenant-joes-diner', '123 Main St, Smalltown, USA', '+1-555-123-4567', 'America/New_York', 0)
ON CONFLICT(tenant_id) DO NOTHING;

INSERT INTO categories (id, tenant_id, name, sort_order, is_visible)
VALUES 
  (1, 'tenant-joes-diner', 'Breakfast', 1, 1),
  (2, 'tenant-joes-diner', 'Lunch', 2, 1),
  (3, 'tenant-joes-diner', 'Desserts', 3, 1)
ON CONFLICT(id) DO NOTHING;

INSERT INTO menu_items (id, tenant_id, category_id, name, description, price, is_available, dietary_tags, dietary_tags_verified, is_highlighted, version)
VALUES
  (1, 'tenant-joes-diner', 1, 'Pancake Stack', 'Fluffy pancakes with maple syrup', 7.50, 1, '["V"]', 0, 1, 1),
  (2, 'tenant-joes-diner', 1, 'Bacon & Eggs', 'Classic breakfast plate', 8.75, 1, '[]', 0, 0, 1),
  (3, 'tenant-joes-diner', 2, 'Cheeseburger', '1/3 lb patty with cheddar', 11.00, 1, '[]', 0, 1, 1),
  (4, 'tenant-joes-diner', 2, 'Chicken Club', 'Grilled chicken, bacon, lettuce, tomato', 12.50, 1, '[]', 0, 0, 1),
  (5, 'tenant-joes-diner', 3, 'Apple Pie', 'House-made, served warm', 5.00, 1, '[]', 0, 1, 1)
ON CONFLICT(id) DO NOTHING;

INSERT INTO operating_hours (tenant_id, day_of_week, start_time, end_time)
VALUES
  ('tenant-joes-diner', 0, '07:00', '14:00'),
  ('tenant-joes-diner', 1, '06:00', '14:00'),
  ('tenant-joes-diner', 2, '06:00', '14:00'),
  ('tenant-joes-diner', 3, '06:00', '14:00'),
  ('tenant-joes-diner', 4, '06:00', '14:00'),
  ('tenant-joes-diner', 5, '06:00', '15:00'),
  ('tenant-joes-diner', 6, '07:00', '15:00');

COMMIT;
