import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Separate from vitest.config.mts on purpose: these tests hit the real
 * Supabase project configured in .env.local (there is no test project --
 * see src/test/integration/helpers.ts for the reserved test document/company
 * code and the cleanup that runs after every test). Never wired into `npm
 * test`; run explicitly with `npm run test:integration`.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./src/test/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.itest.ts"],
    setupFiles: ["./src/test/integration/setup.ts"],
    testTimeout: 20_000,
    // Integration tests share the same reserved test document/company code
    // and clean up after themselves sequentially -- running them in
    // parallel would race on that shared state.
    fileParallelism: false,
  },
});
