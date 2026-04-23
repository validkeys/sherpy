import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["packages/*/src/**/*.test.ts", "packages/*/src/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
    },
    environmentMatchGlobs: [
      // Use jsdom for React component tests
      ["packages/web/src/**/*.test.tsx", "jsdom"],
      // Use node for all other tests
      ["packages/api/**/*.test.ts", "node"],
      ["packages/cli/**/*.test.ts", "node"],
      ["packages/shared/**/*.test.ts", "node"],
      ["packages/web/src/**/*.test.ts", "node"],
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./packages/web/src"),
    },
  },
});
