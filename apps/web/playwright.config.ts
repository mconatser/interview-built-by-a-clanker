import { defineConfig, devices } from "@playwright/test";

// Ports are fixed by the app (the API's CORS origin is http://localhost:5173 and the web app's API base is :3001).
// reuseExistingServer is off on purpose: the API keeps its data in memory, so each run gets a fresh API and
// never runs against someone's dev server. If a port is busy, the run fails instead of reusing that server.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "line",
  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "pnpm --filter @acme/api exec tsx src/index.ts",
      url: "http://localhost:3001/health",
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: "pnpm exec vite --port 5173 --strictPort",
      url: "http://localhost:5173",
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
});
