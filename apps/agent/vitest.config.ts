import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      "@diner-saas/db": new URL("../../packages/db/src/index.ts", import.meta.url).pathname,
    },
  },
});
