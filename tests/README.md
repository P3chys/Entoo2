# Entoo2 End-to-End Tests

Comprehensive GUI tests using Playwright for the Entoo2 document management system.

## Overview

This test suite provides comprehensive end-to-end testing for all GUI functionality including:

- **Authentication**: Login, logout, registration
- **Favorites**: Adding/removing favorite subjects
- **File Upload**: Uploading documents, validation, file management
- **Search**: Full-text search with Elasticsearch integration
- **Subject Profiles**: Viewing and editing subject information
- **Dashboard**: File tree navigation, subject browsing

## Structure

```
tests/
├── playwright.config.ts          # Playwright configuration
├── package.json                  # Dependencies and scripts
├── tests/
│   ├── gui/                     # GUI test suites
│   │   ├── auth.spec.ts         # Authentication tests
│   │   ├── favorites.spec.ts    # Favorites functionality
│   │   ├── file-upload.spec.ts  # File upload and management
│   │   ├── search.spec.ts       # Search functionality
│   │   ├── subject-profile.spec.ts # Subject profile modal
│   │   └── dashboard.spec.ts    # General dashboard tests
│   ├── helpers/                 # Test utilities
│   │   ├── auth.helper.ts       # Authentication utilities
│   │   ├── api.helper.ts        # API interaction utilities
│   │   └── ui.helper.ts         # UI interaction utilities
│   └── fixtures/                # Test files (PDFs, documents)
└── test-results/                # Test results and screenshots
```

## Prerequisites

1. **Docker services must be running:**
   ```bash
   docker-compose up -d
   ```

2. **Application must be accessible at http://localhost:8000**

3. **Playwright must be installed:**
   ```bash
   cd tests
   npm install
   npx playwright install chromium
   ```

## Running Tests

### All Tests (Headless Mode)
```bash
cd tests
npm test
```

### Specific Test Suite
```bash
npm test tests/gui/auth.spec.ts
npm test tests/gui/favorites.spec.ts
npm test tests/gui/file-upload.spec.ts
npm test tests/gui/search.spec.ts
```

### With Browser UI (Headed Mode)
```bash
npm run test:headed
```

### Debug Mode
```bash
npm run test:debug
```

### Watch Mode
```bash
npx playwright test --ui
```

## Test Reports

After running tests, view the HTML report:

```bash
npx playwright show-report
```

Reports are generated in `playwright-report/` directory.

## Headless Mode Configuration

Tests run in headless mode by default (no visible browser window). This is configured in [playwright.config.ts](playwright.config.ts):

```typescript
use: {
  headless: true,  // Run without browser UI
  viewport: { width: 1280, height: 720 },
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
}
```

## Test Helpers

### Authentication Helper
```typescript
import { setupAuth, login, logout } from '../helpers/auth.helper';

// Setup auth in beforeEach
test.beforeEach(async ({ page }) => {
  await setupAuth(page);
});
```

### UI Helper
```typescript
import { expandSubject, toggleFavorite, search } from '../helpers/ui.helper';

// Expand a subject
await expandSubject(page, 'Contract Law');

// Toggle favorite
await toggleFavorite(page, 'Contract Law');

// Search
await search(page, 'legal documents');
```

### API Helper
```typescript
import { apiRequest, uploadTestFile } from '../helpers/api.helper';

// Make authenticated API call
const response = await apiRequest(request, page, '/api/favorites');
```

## Writing New Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { setupAuth } from '../helpers/auth.helper';

test.describe('Feature Name Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
  });

  test('should do something', async ({ page }) => {
    // Your test code
    await expect(page.locator('.element')).toBeVisible();
  });
});
```

### Best Practices

1. **Use helpers for common operations:**
   - Don't duplicate auth logic - use `setupAuth()`
   - Don't duplicate UI interactions - use helpers from `ui.helper.ts`

2. **Wait for elements properly:**
   ```typescript
   await waitForVisible(page, '.subject-row');
   await page.waitForLoadState('networkidle');
   ```

3. **Use descriptive test names:**
   ```typescript
   test('should successfully upload a PDF file', async ({ page }) => {
   ```

4. **Clean up after tests:**
   ```typescript
   test.afterEach(async ({ request, page }) => {
     await cleanupTestData(request, page);
   });
   ```

5. **Handle async operations:**
   ```typescript
   await page.waitForTimeout(500); // Only when necessary
   await expect(element).toBeVisible({ timeout: 5000 });
   ```

## Test Fixtures

Place test files in `tests/fixtures/`:

- `test-document.pdf` - Sample PDF for upload tests
- `test-notes.txt` - Sample text file
- Other test documents as needed

## CI/CD Integration

### GitHub Actions Configuration

The workflow is configured to run non-authentication tests automatically:

```yaml
- name: Run Playwright E2E tests (Non-Auth)
  run: |
    npm install
    npx playwright install chromium
    npx playwright test tests/performance/ tests/caching/ tests/pdf-parsing.spec.ts
```

**GUI tests requiring authentication are skipped in CI** because they need:
- A running authenticated session
- Test user credentials
- Database with test data

### Running All Tests in CI

To enable GUI tests in CI, you would need to:

1. **Create test user in database:**
   ```bash
   docker exec php php artisan tinker
   User::create([
     'name' => 'Test User',
     'email' => 'test@entoo.cz',
     'password' => bcrypt('password123')
   ]);
   ```

2. **Update workflow to run GUI tests:**
   ```yaml
   npx playwright test --reporter=list
   ```

### Local Testing

All tests (including GUI) work locally:

```bash
cd tests
npm ci
npx playwright install --with-deps chromium
npm test  # Runs all tests
```

The configuration automatically adjusts for CI environments:
- Increased retries (2 retries in CI)
- Single worker in CI
- Forbids `.only` in CI

## Debugging Failed Tests

1. **View screenshots:**
   ```bash
   open test-results/*/test-failed-1.png
   ```

2. **View videos:**
   ```bash
   open test-results/*/video.webm
   ```

3. **View trace:**
   ```bash
   npx playwright show-trace test-results/*/trace.zip
   ```

4. **Run specific test in debug mode:**
   ```bash
   npx playwright test tests/gui/auth.spec.ts:10 --debug
   ```

## Performance Testing

Search and page load performance is automatically measured in tests:

```typescript
test('should load dashboard quickly', async ({ page }) => {
  const startTime = Date.now();
  await page.goto('/dashboard');
  const loadTime = Date.now() - startTime;

  expect(loadTime).toBeLessThan(3000);
  console.log(`Loaded in ${loadTime}ms`);
});
```

## Troubleshooting

### Tests fail with "Connection refused"
- Ensure Docker services are running: `docker-compose up -d`
- Check that app is accessible: `curl http://localhost:8000`

### Authentication tests fail
- Clear test database if needed
- Check test user credentials in `auth.helper.ts`

### File upload tests fail
- Ensure test fixtures exist in `tests/fixtures/`
- Check file permissions

### Timeout errors
- Increase timeout in `playwright.config.ts`
- Check if services (Elasticsearch, Redis) are healthy

## Contributing

When adding new GUI features:

1. **Always write tests for GUI changes**
2. Update test helpers if adding reusable functionality
3. Run all tests before committing: `npm test`
4. Ensure tests pass in headless mode
5. Add documentation for new test utilities

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Test API](https://playwright.dev/docs/api/class-test)
- [Best Practices](https://playwright.dev/docs/best-practices)
