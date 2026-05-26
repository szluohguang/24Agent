import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './specs',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    locale: 'zh-CN',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], locale: 'zh-CN' },
    },
  ],
  webServer: {
    command: 'npx tsx test-server.ts',
    url: 'http://localhost:3000/health',
    reuseExistingServer: !process.env.CI,
    timeout: 15000,
  },
})
