import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Limit workers to prevent server overload - use 2 workers max for better stability
  workers: process.env.CI ? 1 : 1,
  reporter: [
    ['html'],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }]
  ],

  // Global timeout settings - increased for GUI tests with authentication
  timeout: 60000, // 60 seconds per test (GUI tests need more time)
  expect: {
    timeout: 10000, // 10 seconds for assertions (increased for slow server responses)
  },

  use: {
    baseURL: 'http://localhost:8000',
    trace: 'on-first-retry',
    screenshot: 'on',
    video: 'retain-on-failure',

    // Headless mode configuration
    headless: true, // Always run in headless mode by default

    // Browser context options
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    acceptDownloads: true,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        headless: true,
      },
    },

    // Uncomment to enable Firefox tests
    // {
    //   name: 'firefox',
    //   use: {
    //     ...devices['Desktop Firefox'],
    //     headless: true,
    //   },
    // },

    // Uncomment to enable WebKit tests
    // {
    //   name: 'webkit',
    //   use: {
    //     ...devices['Desktop Safari'],
    //     headless: true,
    //   },
    // },

    // Mobile viewports for responsive testing
    // {
    //   name: 'Mobile Chrome',
    //   use: {
    //     ...devices['Pixel 5'],
    //     headless: true,
    //   },
    // },
  ],

  // Web server configuration - start the app before tests if not already running
  webServer: {
    command: 'echo "Ensure docker-compose up is running on port 8000"',
    port: 8000,
    timeout: 120 * 1000,
    reuseExistingServer: true,
  },
});
