CREATE TABLE `subscription_events` (
  `id` integer PRIMARY KEY AUTOINCREMENT,
  `tenant_id` text REFERENCES tenants(id),
  `event_type` text NOT NULL,
  `stripe_event_id` text,
  `previous_status` text,
  `new_status` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP
);
