import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    passWithNoTests: true,
    projects: [
      "protocol/vitest.config.ts",
      "client/vitest.config.ts",
      "directory/vitest.config.ts",
    ],
  },
});
