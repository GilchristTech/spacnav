import { defineConfig } from "vitest/config";
import { playwright   } from "@vitest/browser-playwright";

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      headless: true,
      screenshotFailures: false,
      provider: playwright(),
      instances: [ { browser: "chromium" } ],
    },
  },
});

