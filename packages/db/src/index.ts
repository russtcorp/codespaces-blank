import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export { schema };

// Phase 1: Schema exports
export type { Database } from "./schema";

// Phase 2: Safe Query middleware (tenant isolation)
export { SafeDatabase, createSafeDb, createUserContext, createAdminContext, validateTenantId } from "./safe-query";
export type { QueryContext } from "./safe-query";

// Phase 2: Hostname-to-tenant caching
export { createHostnameCache, syncHostnameCache, invalidateHostnameCache } from "./hostname-cache";
export type { HostnameCache } from "./hostname-cache";

// Phase 2: Session management
export { createSessionStore, validateSessionFromRequest, setSessionCookie } from "./session-store";
export type { SessionData, SessionStore } from "./session-store";

// Phase 2: Menu CRUD operations
export { MenuCRUD } from "./menu-crud";
export type {
  CreateMenuItemPayload,
  UpdateMenuItemPayload,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from "./menu-crud";

// Phase 2: Hours/Open Status logic
export { getOpenStatus, getHoursForDay, formatOpenStatus, validateTimeRange, hasOverlappingRanges } from "./hours-logic";
export type { OpenStatus } from "./hours-logic";

// Phase 2: Emergency button service
export {
  createEmergencyButtonService,
  checkEmergencyStatus,
  createEmergencyCloseResponse,
} from "./emergency-button";
export type { EmergencyClosePayload, EmergencyStatus } from "./emergency-button";

