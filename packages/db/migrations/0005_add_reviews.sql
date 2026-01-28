CREATE TABLE `reviews` (
  `id` integer PRIMARY KEY AUTOINCREMENT,
  `tenant_id` text REFERENCES tenants(id),
  `platform` text NOT NULL,
  `external_id` text NOT NULL,
  `reviewer_name` text,
  `rating` integer,
  `content` text,
  `ai_draft_response` text,
  `status` text DEFAULT 'new', -- new, drafted, approved, posted
  `posted_at` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX `reviews_tenant_idx` ON `reviews` (`tenant_id`);
