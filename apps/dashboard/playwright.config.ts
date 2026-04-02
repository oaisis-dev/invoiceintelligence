import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const smokeEnabled = process.env.E2E_ENABLE_SMOKE === "1";
const useLocalWebServer = smokeEnabled && !process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    ...(process.env.PLAYWRIGHT_STORAGE_STATE
      ? { storageState: process.env.PLAYWRIGHT_STORAGE_STATE }
      : {}),
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: useLocalWebServer
    ? {
        command:
          "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_Y2xlcmsuZXhhbXBsZS5jb20k NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=placeholder npm run dev -- --hostname 127.0.0.1 --port 3000",
        port: 3000,
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
      }
    : undefined,
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
