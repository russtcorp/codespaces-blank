import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  // Global setup file for authentication - commented out until implemented
  // globalSetup: require.resolve('./setup/auth.setup.ts'),

  use: {
    trace: 'on-first-retry',
    baseURL: process.env.PUBLIC_BASE_URL || 'http://127.0.0.1:3000',
  },

  projects: [
    {
      name: 'chromium-public',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.PUBLIC_BASE_URL || 'http://127.0.0.1:3000',
      },
      testMatch: /public-site\.spec\.ts/,
    },
    {
      name: 'chromium-store',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.STORE_BASE_URL || 'http://127.0.0.1:3001',
      },
      testMatch: /store-.*\.spec\.ts/,
    },
    {
      name: 'chromium-admin',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.ADMIN_BASE_URL || 'http://127.0.0.1:8790',
      },
      testMatch: /admin-.*\.spec\.ts/,
    },
  ],

  webServer: [
    {
      command: 'cd ../../apps/public && pnpm dev',
      url: 'http://127.0.0.1:3000',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'cd ../../apps/store && pnpm dev',
      url: 'http://127.0.0.1:3001',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'cd ../../apps/admin && pnpm dev',
      url: 'http://127.0.0.1:8790',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
