import { json } from "@remix-run/cloudflare";
import { getFeatureFlags } from "@diner-saas/config/src/feature-flags";

/**
 * A Remix loader utility that fetches feature flags and returns them.
 * This is intended to be called and spread within other loaders.
 * @example
 * export async function loader({ request, context }: LoaderFunctionArgs) {
 *   const flags = await getFlags(context);
 *   return json({ ...flags });
 * }
 */
export const getFlags = async (context: any, tenantId: string) => {
  const flags = await getFeatureFlags(context.cloudflare.env.FEATURE_FLAGS, tenantId);
  return { flags };
};


/**
 * Injects a script into the HTML to make flags available on the client.
 * Must be used in root.tsx or a layout.
 * @param flags The feature flags object from the loader.
 */
export const FlagsInjector = ({ flags }: { flags: Record<string, boolean> }) => {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `window.featureFlags = ${JSON.stringify(flags)}`,
      }}
    />
  );
};

/**
 * Hook to check if a feature is enabled on the client.
 * @param flagName The name of the feature flag.
 */
export const useFeature = (flagName: keyof Window['featureFlags']): boolean => {
  if (typeof window === 'undefined' || !window.featureFlags) {
    return false; // Default to false during SSR or if flags aren't loaded
  }
  return window.featureFlags[flagName] ?? false;
};

// Add this to your global.d.ts or a relevant declaration file
declare global {
  interface Window {
    featureFlags: Record<string, boolean>;
  }
}
