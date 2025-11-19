/**
 * Test Lifecycle Helper
 * Provides reusable hooks for test setup and cleanup
 */

import { Page, APIRequestContext } from '@playwright/test';
import { cleanupTestSuite, TestDataRegistry } from './cleanup.helper';

/**
 * Standard afterAll hook for test suites
 * Cleans up data created during the test suite
 *
 * Usage in test file:
 * ```typescript
 * test.afterAll(async ({ request, page }) => {
 *   await afterAllCleanup('file-upload', request, page);
 * });
 * ```
 */
export async function afterAllCleanup(
  suiteName: string,
  request: APIRequestContext,
  page: Page
): Promise<void> {
  await cleanupTestSuite(suiteName, request, page);
}

/**
 * Get current test data statistics
 */
export function getTestDataStats() {
  return {
    files: TestDataRegistry.getUploadedFiles().length,
    users: TestDataRegistry.getCreatedUsers().length,
    subjects: TestDataRegistry.getCreatedSubjects().length,
  };
}

/**
 * Log test data statistics
 */
export function logTestDataStats(label: string = 'Test Data') {
  const stats = getTestDataStats();
  console.log(`\n📊 ${label} Statistics:`);
  console.log(`   Files: ${stats.files}`);
  console.log(`   Users: ${stats.users}`);
  console.log(`   Subjects: ${stats.subjects}\n`);
}
