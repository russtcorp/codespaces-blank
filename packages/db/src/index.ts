import * as schema from "./schema";
import { drizzle } from "drizzle-orm/d1";

export { schema };

// Database factory
export function createDb(d1Binding: any) {
  return drizzle(d1Binding);
}

// Re-export table schema for app consumption
export {
  tenants,
  themeConfig,
  businessSettings,
  authorizedUsers,
  operatingHours,
  specialDates,
  menuItems,
  categories,
} from "./schema";

// Safe Query middleware (tenant isolation)
export { SafeDatabase, createSafeDb, createUserContext, createAdminContext, validateTenantId } from "./safe-query";
export type { QueryContext } from "./safe-query";

// Hostname-to-tenant caching
export { createHostnameCache, syncHostnameCache, invalidateHostnameCache } from "./hostname-cache";
export type { HostnameCache } from "./hostname-cache";

// Session management
export { createSessionStore, validateSessionFromRequest, setSessionCookie } from "./session-store";
export type { SessionData, SessionStore } from "./session-store";

// Menu CRUD operations
export { MenuCRUD } from "./menu-crud";
export type {
  CreateMenuItemPayload,
  UpdateMenuItemPayload,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from "./menu-crud";

// Hours/Open Status logic
export { getOpenStatus, getHoursForDay, formatOpenStatus, validateTimeRange, hasOverlappingRanges } from "./hours-logic";
export type { OpenStatus } from "./hours-logic";

// Emergency button service
export {
  createEmergencyButtonService,
  checkEmergencyStatus,
  createEmergencyCloseResponse,
} from "./emergency-button";
export type { EmergencyClosePayload, EmergencyStatus } from "./emergency-button";

// Broadcast system (KV)
export { createBroadcastMessage, publishBroadcast, getActiveBroadcasts, clearAllBroadcasts } from "./broadcast";
export type { BroadcastMessage as Broadcast } from "./broadcast";

