---
description: Run Playwright tests, debug, or open UI mode
---

# Playwright Testing Workflows

This workflow provides commands to run, debug, and manage Playwright tests.

## Run All Tests
Runs all tests in headless mode.
```bash
npm test
```

## Run Tests in UI Mode
Opens the interactive Playwright UI for running and debugging tests.
```bash
npm run test:ui
```

## Debug Tests
Runs tests in debug mode with the inspector.
```bash
npm run test:debug
```

## Run Specific Test File
Replace `[filename]` with the path to your test file (e.g., `tests/auth.spec.ts`).
```bash
npx playwright test [filename] --project=chromium
```

## Generate Tests (Codegen)
Opens a browser to record user interactions and generate test code.
```bash
npx playwright codegen http://localhost:8000
```

## Show Report
Opens the HTML report from the last test run.
```bash
npx playwright show-report tests/playwright-report
```
