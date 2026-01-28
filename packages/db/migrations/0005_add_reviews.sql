CREATE TABLE `reviews` (
  `id` integer PRIMARY KEY AUTOINCREMENT,
  `tenantId` text REFERENCES tenants(id),
  `platform` text NOT NULL,
  `externalId` text NOT NULL,
  `reviewerName` text,
  `rating` integer,
  `content` text,
  `aiDraftResponse` text,
  `status` text DEFAULT 'new', -- new, drafted, approved, posted
  `postedAt` text,
  `createdAt` text DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX `reviews_tenant_idx` ON `reviews` (`tenantId`);
