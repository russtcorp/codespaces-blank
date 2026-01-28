CREATE TABLE `social_posts` (
  `id` text PRIMARY KEY NOT NULL,
  `tenant_id` text REFERENCES tenants(id),
  `platform` text NOT NULL,
  `external_id` text NOT NULL,
  `caption` text,
  `media_url` text,
  `permalink` text,
  `thumbnail_url` text,
  `posted_at` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX `social_posts_tenant_idx` ON `social_posts` (`tenant_id`);
