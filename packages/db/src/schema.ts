import { json, sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

// ... (existing schema)

export const menuItemInteractions = sqliteTable("menu_item_interactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenant_id").notNull(),
  itemId: integer("item_id").notNull().references(() => menuItems.id, { onDelete: 'cascade' }),
  interactionType: text("interaction_type").notNull(), // e.g., 'view'
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  tenantIdIdx: index("menu_item_interactions_tenant_id_idx").on(table.tenantId),
}));

// ... (rest of the schema file)