/**
 * Tenant status types
 */
export const TENANT_STATUS = {
  BUILDING: 'building', // Initial setup in progress
  ACTIVE: 'active', // Live and operational
  SUSPENDED: 'suspended', // Payment issues or violations
  ARCHIVED: 'archived', // Closed but data retained
} as const;

export type TenantStatus = (typeof TENANT_STATUS)[keyof typeof TENANT_STATUS];

/**
 * Version channels for gradual rollouts
 */
export const VERSION_CHANNELS = {
  STABLE: 'stable',
  BETA: 'beta',
  CANARY: 'canary',
} as const;

export type VersionChannel = (typeof VERSION_CHANNELS)[keyof typeof VERSION_CHANNELS];

/**
 * Layout style options for tenant sites
 */
export const LAYOUT_STYLES = {
  GRID: 'grid',
  LIST: 'list',
  MINIMAL: 'minimal',
  PRINT: 'print',
} as const;

export type LayoutStyle = (typeof LAYOUT_STYLES)[keyof typeof LAYOUT_STYLES];
