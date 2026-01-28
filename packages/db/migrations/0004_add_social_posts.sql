CREATE TABLE `social_posts` (
  `id` text PRIMARY KEY NOT NULL,
  `tenantId` text REFERENCES tenants(id),
  `platform` text NOT NULL,
  `externalId` text NOT NULL,
  `caption` text,
  `mediaUrl` text,
  `permalink` text,
  `thumbnailUrl` text,
  `postedAt` text,
  `createdAt` text DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX `social_posts_tenant_idx` ON `social_posts` (`tenantId`);
