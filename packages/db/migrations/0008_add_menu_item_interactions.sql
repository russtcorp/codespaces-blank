CREATE TABLE `menu_item_interactions` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `tenant_id` text NOT NULL,
    `item_id` integer NOT NULL,
    `interaction_type` text NOT NULL,
    `created_at` text DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`item_id`) REFERENCES `menu_items`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX `menu_item_interactions_tenant_id_idx` ON `menu_item_interactions` (`tenant_id`);
