import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  // Global setup file for authentication
  globalSetup: require.resolve('./setup/auth.setup.ts'),

  use: {
    trace: 'on-first-retry',
  },

// ... (imports and existing config)

  projects: [
    // ... (existing public and store projects)
    {
      name: 'chromium-admin',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.ADMIN_BASE_URL || 'http://127.0.0.1:8790',
      },
      testMatch: /admin-onboarding\.spec\.ts/,
    },
  ],

  webServer: [
    // ... (existing public and store webServers)
    {
      command: 'cd ../ && pnpm dev:admin',
      url: 'http://127.0.0.1:8790',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
