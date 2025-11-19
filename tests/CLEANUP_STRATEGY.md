# Test Data Cleanup Strategy

This document describes the automated test data cleanup system for Entoo2 E2E tests.

## Overview

The cleanup system provides three levels of automation:

1. **Global Teardown** - Runs automatically after all tests complete
2. **Artisan Command** - Direct database/Elasticsearch cleanup (bypasses API authorization)
3. **Manual Cleanup** - Standalone script for manual execution

## Cleanup Architecture

### Artisan Command (Recommended)

All cleanup operations now use the Laravel artisan command which:

✅ **Bypasses API authorization** - Can delete test files owned by any user
✅ **Cleans all data sources** - PostgreSQL, Elasticsearch, Redis cache
✅ **More reliable** - Direct database access, no HTTP overhead
✅ **Faster execution** - No authentication or API calls required

```bash
# Run cleanup directly
docker exec php php artisan cleanup:test-data --all

# Dry run to see what would be deleted
docker exec php php artisan cleanup:test-data --dry-run
```

**Command location:** [webapp/app/Console/Commands/CleanupTestData.php](../webapp/app/Console/Commands/CleanupTestData.php)

## Components

### 1. Cleanup Helper ([tests/helpers/cleanup.helper.ts](tests/helpers/cleanup.helper.ts))

Core cleanup functionality with pattern-based detection:

```typescript
import { smartCleanup, TestDataRegistry } from '../helpers/cleanup.helper';

// Track test data
TestDataRegistry.registerFile(fileId);
TestDataRegistry.registerUser(email);
TestDataRegistry.registerSubject(subjectName);

// Clean up everything
await smartCleanup(request, page, {
  files: true,
  subjects: true,
  fixtures: true,
  users: false,
});
```

**Pattern Detection:**

Files are detected by:
- Starting with `test-`, `playwright`, `large-file`
- Ending with `-test.`
- Containing test patterns (test-delete, test-document, test-notes)

Subjects are detected by:
- Starting with `Test Subject`
- Containing XSS payloads (`<script>`, `<img src=x`, `alert(`, etc.)
- Ending with `TestSubject`
- Starting with `">` (XSS injection attempts)

**Note:** Subjects are automatically cleaned when their files are deleted, as subjects without files don't persist in the system.

### 2. Global Teardown ([global-teardown.ts](global-teardown.ts))

Automatically runs after all tests:

```typescript
// Configured in playwright.config.ts
globalTeardown: './global-teardown.ts'
```

**What it does:**
- Executes `php artisan cleanup:test-data --all`
- Cleans PostgreSQL, Elasticsearch, and Redis
- Removes all test files/subjects matching patterns

**When it runs:**
- After ALL tests complete (success or failure)
- Only once per test run
- Does NOT run if tests are interrupted (Ctrl+C)

**Implementation:**
```typescript
const { stdout } = await execAsync('docker exec php php artisan cleanup:test-data --all');
```

### 3. Manual Cleanup Script ([scripts/cleanup-test-data.ts](scripts/cleanup-test-data.ts))

Run manually when needed:

```bash
# Run cleanup script
cd tests
npm run cleanup

# Or directly with ts-node
npx ts-node scripts/cleanup-test-data.ts
```

**Use cases:**
- Clean up after interrupted test runs
- Clean database before fresh test run
- Manual maintenance

**Implementation:**
Uses the artisan command internally, same as global teardown.

### 4. Test Lifecycle Helper ([tests/helpers/test-lifecycle.helper.ts](tests/helpers/test-lifecycle.helper.ts))

Reusable hooks for test suites:

```typescript
import { afterAllCleanup, logTestDataStats } from '../helpers/test-lifecycle.helper';

test.describe('My Test Suite', () => {
  test.afterAll(async ({ request, page }) => {
    await afterAllCleanup('my-test-suite', request, page);
  });

  test('my test', async ({ page }) => {
    // Test code...
    logTestDataStats('Before Cleanup');
  });
});
```

## Usage Examples

### Example 1: Global Cleanup Only (Default)

No code changes needed - just run tests:

```bash
npm test
```

Global teardown automatically cleans up after all tests complete.

### Example 2: Suite-Level Cleanup

Add cleanup to specific test suites:

```typescript
import { test } from '@playwright/test';
import { afterAllCleanup } from '../helpers/test-lifecycle.helper';

test.describe('File Upload Tests', () => {
  test.afterAll(async ({ request, page }) => {
    await afterAllCleanup('file-upload', request, page);
  });

  // Your tests...
});
```

### Example 3: Track and Clean Specific Data

```typescript
import { TestDataRegistry } from '../helpers/cleanup.helper';
import { cleanupTestSuite } from '../helpers/cleanup.helper';

test('upload file', async ({ page, request }) => {
  // Upload file
  const fileId = 123; // From API response

  // Track it for cleanup
  TestDataRegistry.registerFile(fileId);

  // File will be cleaned up by global teardown
});

// Or clean up immediately after test
test.afterEach(async ({ request, page }) => {
  await cleanupTestSuite('file-upload', request, page);
});
```

### Example 4: Manual Cleanup Before Tests

```bash
# Clean up test data first, then run tests
npm run test:clean

# This runs:
# 1. npm run cleanup (manual cleanup script)
# 2. npm test (runs all tests)
```

## Configuration

### Playwright Config ([playwright.config.ts](playwright.config.ts))

```typescript
export default defineConfig({
  // ... other config

  // Enable global teardown
  globalTeardown: './global-teardown.ts',
});
```

### TypeScript Config ([tsconfig.json](tsconfig.json))

**Required for ts-node scripts to work:**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node", "@playwright/test"]
  },
  "ts-node": {
    "transpileOnly": true,
    "compilerOptions": {
      "module": "commonjs"
    }
  }
}
```

### Package Scripts ([package.json](package.json))

```json
{
  "scripts": {
    "test": "playwright test",
    "cleanup": "npx ts-node scripts/cleanup-test-data.ts",
    "test:clean": "npm run cleanup && npm test"
  }
}
```

## How It Works

### Pattern-Based Detection

#### File Patterns

Files are identified as test data using regex patterns:

```typescript
const testPatterns = [
  /^test-/i,           // Starts with "test-"
  /playwright/i,       // Contains "playwright"
  /-test\./i,          // Ends with "-test."
  /^large-file/i,      // Large test files
  /^test\.pdf$/i,      // Generic test files
  /test-delete/i,      // Delete test files
  /test-document/i,    // Test documents
  /test-notes/i,       // Test notes
];
```

**File Naming Convention:**
- ✅ `test-upload.pdf`
- ✅ `test-delete-file.docx`
- ✅ `playwright-test-document.pdf`
- ❌ `mydocument.pdf` (won't be cleaned)

#### Subject Patterns

Subjects matching these patterns have all their files deleted (removing the subject):

```typescript
const testSubjectPatterns = [
  /^Test Subject/i,    // Starts with "Test Subject"
  /^<img src/i,        // XSS test: img tags
  /alert\(/i,          // XSS test: alert calls
  /<script>/i,         // XSS test: script tags
  /^">/i,              // XSS test: quote injection
  /TestSubject$/i,     // Ends with "TestSubject"
];
```

**Examples of subjects that will be cleaned:**
- `Test Subject 123`
- `<script>alert("XSS")</script>TestSubject`
- `<img src=x onerror="alert('XSS')" />TestSubject`
- `"><script>alert(1)</script>TestSubject`

**How it works:** Cleanup deletes all files from matching subjects, which causes the subject to be automatically removed from the system (subjects without files don't persist).

**To add new patterns**, edit [cleanup.helper.ts](tests/helpers/cleanup.helper.ts):

```typescript
const testPatterns = [
  // ... existing patterns
  /my-custom-pattern/i,
];
```

### Registry Tracking

Track specific data for cleanup:

```typescript
// In your test
const fileId = await uploadFile();
TestDataRegistry.registerFile(fileId);

// Later, in cleanup
const filesToDelete = TestDataRegistry.getUploadedFiles();
// Clean up tracked files
```

### Authentication

All cleanup operations require authentication:

```typescript
// Login as test user
await page.goto('/login');
await page.fill('input[name="email"]', 'playwright-test@entoo.cz');
await page.fill('input[name="password"]', 'password12*');
await page.click('button[type="submit"]');

// Now can call cleanup functions
await cleanupTestFiles(request, page);
```

## Best Practices

### 1. Use Descriptive Test File Names

```typescript
// Good - will be auto-detected
const fileName = 'test-user-upload-document.pdf';

// Bad - won't be auto-detected
const fileName = 'document.pdf';
```

### 2. Register Important Data

```typescript
// Always register data you create
TestDataRegistry.registerFile(fileId);
TestDataRegistry.registerSubject(subjectName);
```

### 3. Choose Right Cleanup Level

- **Global cleanup** - Default, runs after all tests
- **Suite cleanup** - For isolated test suites
- **Manual cleanup** - For development/debugging

### 4. Test Cleanup in CI

```bash
# CI should always run cleanup
npm run test:clean
```

### 5. Handle Cleanup Errors Gracefully

```typescript
try {
  await cleanupTestFiles(request, page);
} catch (error) {
  console.warn('Cleanup failed:', error);
  // Don't fail the test run
}
```

## Troubleshooting

### Cleanup Not Running

**Problem:** Global teardown not executing

**Solutions:**
1. Check `playwright.config.ts` has `globalTeardown: './global-teardown.ts'`
2. Ensure tests complete (not interrupted)
3. Check console for teardown logs

### Files Not Being Deleted

**Problem:** Test files remain after cleanup

**Solutions:**
1. Check file name matches a pattern in `testPatterns`
2. Verify authentication is working
3. Check file permissions
4. Run manual cleanup: `npm run cleanup`

### Authentication Fails in Teardown

**Problem:** Cannot login during cleanup

**Solutions:**
1. Ensure test user exists: `playwright-test@entoo.cz`
2. Check password is correct: `password12*`
3. Verify server is running
4. Check rate limiting isn't blocking login

## Maintenance

### Adding New Cleanup Patterns

Edit [cleanup.helper.ts](tests/helpers/cleanup.helper.ts):

```typescript
const testPatterns = [
  // Add your pattern here
  /new-test-pattern/i,
];
```

### Extending TestDataRegistry

Add new data types:

```typescript
export class TestDataRegistry {
  private static myNewData: string[] = [];

  static registerMyNewData(data: string) {
    this.myNewData.push(data);
  }

  static getMyNewData() {
    return [...this.myNewData];
  }
}
```

### Creating Custom Cleanup Functions

```typescript
export async function cleanupMyCustomData(
  request: APIRequestContext,
  page: Page
): Promise<void> {
  const token = await getAuthToken(page);
  if (!token) return;

  // Your cleanup logic here
  const data = TestDataRegistry.getMyNewData();
  for (const item of data) {
    await request.delete(`/api/my-data/${item}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
  }
}
```

## Summary

**Quick Start:**
1. Run tests normally: `npm test`
2. Global teardown cleans up automatically (via artisan command)
3. Use manual cleanup if needed: `npm run cleanup`

**Direct Cleanup (Recommended):**
```bash
# Clean all test data immediately
docker exec php php artisan cleanup:test-data --all

# Preview what would be deleted
docker exec php php artisan cleanup:test-data --dry-run
```

**Advanced Usage:**
1. Add suite-level cleanup hooks
2. Track specific data with TestDataRegistry
3. Create custom cleanup functions
4. Use `npm run test:clean` for fresh runs

**Architecture:**
- ✅ **Artisan command** - Direct database access, bypasses API authorization
- ✅ **All data sources** - Cleans PostgreSQL, Elasticsearch, Redis cache
- ✅ **Pattern-based** - Automatically detects test data by naming patterns
- ✅ **Comprehensive** - Removes files, subjects, profiles, favorites

**Remember:**
- Name test subjects with patterns like `Test Subject`, `XSS_`, etc.
- Global cleanup runs automatically after tests
- Manual cleanup available anytime via `npm run cleanup`
- Direct cleanup via artisan command for maximum reliability
