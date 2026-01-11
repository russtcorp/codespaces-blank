import { vitePlugin as remix } from '@remix-run/dev';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
      },
      serverBuildFile: 'index.js',
    }),
    tsconfigPaths(),
  ],
  ssr: {
    resolve: {
      conditions: ['workerd', 'worker', 'browser'],
      externalConditions: ['workerd', 'worker'],
    },
  },
  resolve: {
    mainFields: ['browser', 'module', 'main'],
  },
  build: {
    minify: true,
    rollupOptions: {
      external: ['drizzle-orm', '@diner/db', '@diner/config'],
    },
  },
});
