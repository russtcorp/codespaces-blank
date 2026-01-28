import { z } from 'zod';

export const featureFlagsSchema = z.object({
  analyticsDashboard: z.boolean().default(false),
  aiCopilot: z.boolean().default(true),
  // Add new flags here
});

export type FeatureFlags = z.infer<typeof featureFlagsSchema>;

export const getFeatureFlags = async (kv: KVNamespace, tenantId: string): Promise<FeatureFlags> => {
  const flags = await kv.get<FeatureFlags>(`flags:${tenantId}`, 'json');
  // Use schema parsing to ensure defaults are applied for missing flags
  return featureFlagsSchema.parse(flags || {});
};

export const setFeatureFlag = async (
  kv: KVNamespace,
  tenantId: string,
  flagName: keyof FeatureFlags,
  value: boolean
): Promise<void> => {
  const currentFlags = await getFeatureFlags(kv, tenantId);
  const updatedFlags = { ...currentFlags, [flagName]: value };
  await kv.put(`flags:${tenantId}`, JSON.stringify(updatedFlags));
};
