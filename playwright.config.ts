import { defineConfig } from "@playwright/test";

const previewPath = "/game-data-patch-android-warhammer-survivors/";
const baseUrl = process.env["TEST_BASE_URL"] ?? `http://127.0.0.1:4173${previewPath}`;
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  reporter: process.env["CI"] ? "github" : "list",
  use: {
    baseURL: baseUrl,
    browserName: "chromium",
    ...(process.env["TEST_BROWSER_CHANNEL"]
      ? { channel: process.env["TEST_BROWSER_CHANNEL"] }
      : {}),
    trace: "retain-on-failure",
  },
  webServer: process.env["TEST_BASE_URL"]
    ? []
    : {
        command: `pnpm preview --base ${previewPath} --port 4173 --strictPort`,
        url: baseUrl,
        reuseExistingServer: false,
      },
});
