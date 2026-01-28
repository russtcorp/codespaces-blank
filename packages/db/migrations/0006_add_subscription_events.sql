CREATE TABLE `subscription_events` (
  `id` integer PRIMARY KEY AUTOINCREMENT,
  `tenantId` text REFERENCES tenants(id),
  `eventType` text NOT NULL,
  `stripeEventId` text,
  `previousStatus` text,
  `newStatus` text,
  `createdAt` text DEFAULT CURRENT_TIMESTAMP
);
