import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests",
  testMatch: "game.spec.ts",
  use: { baseURL: "http://localhost:3000" },
  webServer: {
    command: "npm run dev:harness",
    url: "http://localhost:3000",
    reuseExistingServer: false,
    timeout: 120000,
  },
});
