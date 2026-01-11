import { defineConfig } from '@remix-run/dev';

export default defineConfig({
  appDirectory: 'app',
  future: {
    v3_fetcherPersist: true,
    v3_relativeSplatPath: true,
    v3_throwAbortReason: true,
  },
  ignoredRouteFiles: ['**/*.css', '**/*.test.{js,ts,tsx}'],
  serverModuleFormat: 'esm',
  serverPlatform: 'neutral',
  serverConditions: ['workerd'],
});
