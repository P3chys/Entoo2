# Test Optimization Guide: 10 Steps to Better E2E Testing

This guide provides a roadmap for optimizing the Entoo2 E2E test suite for better readability, maintainability, and reliability.

## Table of Contents

1. [Page Object Model (POM) Pattern](#step-1-implement-page-object-model-pom)
2. [Component Objects](#step-2-create-component-objects)
3. [Test Fixtures](#step-3-leverage-test-fixtures)
4. [Data Builders](#step-4-implement-data-builders)
5. [Custom Matchers](#step-5-create-custom-matchers)
6. [Test Utilities Library](#step-6-build-test-utilities-library)
7. [Parallel Test Optimization](#step-7-optimize-parallel-execution)
8. [Visual Regression Testing](#step-8-add-visual-regression-testing)
9. [Performance Monitoring](#step-9-implement-performance-monitoring)
10. [CI/CD Integration](#step-10-enhance-cicd-integration)

---

## Step 1: Implement Page Object Model (POM)

**Goal:** Encapsulate page interactions into reusable classes

### Current State
```typescript
// Tests directly interact with page elements
test('upload file', async ({ page }) => {
  await page.click('#uploadFileBtn');
  await page.fill('input[name="subject_name"]', 'Math');
  await page.setInputFiles('input[type="file"]', filePath);
  await page.click('button[type="submit"]');
});
```

### Optimized State
```typescript
// Create page objects
class DashboardPage {
  constructor(private page: Page) {}

  async openUploadModal() {
    await this.page.click('#uploadFileBtn');
  }

  async uploadFile(subject: string, category: string, filePath: string) {
    await this.openUploadModal();
    await this.page.fill('input[name="subject_name"]', subject);
    await this.page.selectOption('select[name="category"]', category);
    await this.page.setInputFiles('input[type="file"]', filePath);
    await this.page.click('button[type="submit"]');
  }

  async waitForUploadSuccess() {
    await this.page.waitForSelector('.alert-success:has-text("uploaded")');
  }
}

// Use in tests
test('upload file', async ({ page }) => {
  const dashboard = new DashboardPage(page);
  await dashboard.uploadFile('Math', 'Materialy', 'test.pdf');
  await dashboard.waitForUploadSuccess();
});
```

### Implementation Plan

Create [pages/dashboard.page.ts](tests/pages/dashboard.page.ts):
```typescript
import { Page, Locator } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly uploadBtn: Locator;
  readonly searchInput: Locator;
  readonly fileTree: Locator;

  constructor(page: Page) {
    this.page = page;
    this.uploadBtn = page.locator('#uploadFileBtn');
    this.searchInput = page.locator('#searchInput');
    this.fileTree = page.locator('#treeView');
  }

  async goto() {
    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('networkidle');
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
    await this.page.waitForSelector('#searchResults:not(.hidden)');
  }

  async expandSubject(subjectName: string) {
    const subject = this.page.locator('.subject-row')
      .filter({ hasText: subjectName })
      .first();
    await subject.click();
    await this.page.waitForTimeout(500);
  }

  async toggleFavorite(subjectName: string) {
    const star = this.page.locator('.subject-row')
      .filter({ hasText: subjectName })
      .locator('.favorite-star');
    await star.click();
  }
}
```

Create [pages/upload-modal.page.ts](tests/pages/upload-modal.page.ts):
```typescript
export class UploadModalPage {
  readonly page: Page;
  readonly subjectSelect: Locator;
  readonly categorySelect: Locator;
  readonly fileInput: Locator;
  readonly uploadBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.subjectSelect = page.locator('#subjectSelect');
    this.categorySelect = page.locator('#categorySelect');
    this.fileInput = page.locator('#fileInput');
    this.uploadBtn = page.locator('#uploadBtn');
  }

  async uploadFile(subject: string, category: string, filePath: string) {
    await this.subjectSelect.selectOption(subject);
    await this.categorySelect.selectOption(category);
    await this.fileInput.setInputFiles(filePath);
    await this.uploadBtn.click();
    await this.waitForSuccess();
  }

  async waitForSuccess() {
    await this.page.waitForSelector('.alert-success');
  }
}
```

**Benefits:**
- Single source of truth for selectors
- Easier to update when UI changes
- More readable tests
- Type-safe interactions

---

## Step 2: Create Component Objects

**Goal:** Model reusable UI components

### Current State
```typescript
// Duplicated modal interactions across tests
await page.click('.modal .close-btn');
await page.waitForSelector('.modal.hidden');
```

### Optimized State
```typescript
class ModalComponent {
  constructor(private page: Page, private selector: string) {}

  async isVisible(): Promise<boolean> {
    return await this.page.locator(this.selector).isVisible();
  }

  async close() {
    await this.page.click(`${this.selector} .close-btn`);
    await this.page.waitForSelector(`${this.selector}.hidden`);
  }

  async waitForOpen() {
    await this.page.waitForSelector(`${this.selector}:not(.hidden)`);
  }
}

// Use in page objects
class DashboardPage {
  readonly uploadModal: ModalComponent;

  constructor(page: Page) {
    this.uploadModal = new ModalComponent(page, '#uploadModal');
  }

  async openUploadModal() {
    await this.uploadBtn.click();
    await this.uploadModal.waitForOpen();
  }
}
```

### Component Library Structure

Create [components/](tests/components/):
- `modal.component.ts` - Generic modal interactions
- `file-tree.component.ts` - File tree navigation
- `search-results.component.ts` - Search results grid
- `favorite-star.component.ts` - Favorite toggle button
- `alert.component.ts` - Success/error alerts

Example [components/file-tree.component.ts](tests/components/file-tree.component.ts):
```typescript
export class FileTreeComponent {
  constructor(private page: Page) {}

  async expandSubject(subjectName: string) {
    const subject = this.getSubjectRow(subjectName);
    const isExpanded = await subject.locator('.expanded').count() > 0;

    if (!isExpanded) {
      await subject.click();
      await this.page.waitForTimeout(500);
    }
  }

  async selectCategory(subjectName: string, categoryName: string) {
    await this.expandSubject(subjectName);
    const categoryTab = this.page.locator(`button:has-text("${categoryName}")`);
    await categoryTab.click();
    await this.page.waitForTimeout(300);
  }

  async getFileCount(subjectName: string, categoryName: string): Promise<number> {
    await this.selectCategory(subjectName, categoryName);
    return await this.page.locator('.file-item').count();
  }

  private getSubjectRow(subjectName: string): Locator {
    return this.page.locator('.subject-row')
      .filter({ hasText: subjectName })
      .first();
  }
}
```

**Benefits:**
- Reusable component logic
- Consistent behavior across tests
- Easier testing of complex UI patterns

---

## Step 3: Leverage Test Fixtures

**Goal:** Standardize test setup and teardown

### Current State
```typescript
test.beforeEach(async ({ page }) => {
  await setupAuth(page);
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
});
```

### Optimized State
```typescript
// Define custom fixtures
import { test as base, Page } from '@playwright/test';
import { DashboardPage } from './pages/dashboard.page';

type MyFixtures = {
  dashboardPage: DashboardPage;
  authenticatedPage: Page;
};

export const test = base.extend<MyFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await setupAuth(page);
    await use(page);
  },

  dashboardPage: async ({ authenticatedPage }, use) => {
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.goto();
    await use(dashboard);
  },
});

// Use in tests
test('upload file', async ({ dashboardPage }) => {
  await dashboardPage.uploadFile('Math', 'Materialy', 'test.pdf');
  // dashboardPage is ready to use!
});
```

### Fixture Examples

Create [fixtures/index.ts](tests/fixtures/index.ts):
```typescript
export const test = base.extend<{
  // Authentication fixtures
  authenticatedPage: Page;
  testUser: TestUser;

  // Page fixtures
  dashboardPage: DashboardPage;
  loginPage: LoginPage;

  // Component fixtures
  fileTree: FileTreeComponent;
  uploadModal: UploadModalComponent;

  // Data fixtures
  testFile: TestFile;
  testSubject: Subject;

  // API fixtures
  apiContext: APIRequestContext;
}>({
  authenticatedPage: async ({ page }, use) => {
    await setupAuth(page);
    await use(page);
  },

  dashboardPage: async ({ authenticatedPage }, use) => {
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.goto();
    await use(dashboard);
  },

  fileTree: async ({ authenticatedPage }, use) => {
    await use(new FileTreeComponent(authenticatedPage));
  },

  testFile: async ({}, use) => {
    const file = await createTestFile('test.pdf');
    await use(file);
    await fs.unlinkSync(file.path);
  },
});
```

**Benefits:**
- Automatic setup/teardown
- Dependency injection for tests
- Reusable test context
- Type-safe fixtures

---

## Step 4: Implement Data Builders

**Goal:** Create test data programmatically

### Current State
```typescript
// Hardcoded test data
const testFile = {
  subject: 'Math',
  category: 'Materialy',
  filename: 'test.pdf'
};
```

### Optimized State
```typescript
class FileBuilder {
  private data: Partial<TestFile> = {};

  withSubject(subject: string) {
    this.data.subject = subject;
    return this;
  }

  withCategory(category: Category) {
    this.data.category = category;
    return this;
  }

  withFilename(filename: string) {
    this.data.filename = filename;
    return this;
  }

  build(): TestFile {
    return {
      subject: this.data.subject || 'Default Subject',
      category: this.data.category || 'Materialy',
      filename: this.data.filename || 'test.pdf',
      size: this.data.size || 1024,
    };
  }
}

// Use in tests
test('upload file', async ({ dashboardPage }) => {
  const file = new FileBuilder()
    .withSubject('Advanced Math')
    .withCategory('Prednasky')
    .withFilename('lecture-01.pdf')
    .build();

  await dashboardPage.uploadFile(file);
});
```

### Builder Library

Create [builders/](tests/builders/):
```typescript
// builders/file.builder.ts
export class FileBuilder {
  private data: Partial<TestFile> = {
    subject: 'Test Subject',
    category: 'Materialy',
    filename: `test-${Date.now()}.pdf`,
  };

  static create() {
    return new FileBuilder();
  }

  withSubject(subject: string) {
    this.data.subject = subject;
    return this;
  }

  withCategory(category: 'Materialy' | 'Otazky' | 'Prednasky' | 'Seminare') {
    this.data.category = category;
    return this;
  }

  large() {
    this.data.size = 10 * 1024 * 1024; // 10MB
    return this;
  }

  small() {
    this.data.size = 1024; // 1KB
    return this;
  }

  build(): TestFile {
    return this.data as TestFile;
  }

  async buildAndUpload(page: Page): Promise<number> {
    const file = this.build();
    const response = await uploadFile(page, file);
    return response.id;
  }
}

// builders/user.builder.ts
export class UserBuilder {
  private data: Partial<User> = {};

  static create() {
    return new UserBuilder();
  }

  withEmail(email: string) {
    this.data.email = email;
    return this;
  }

  withRandomEmail() {
    this.data.email = `test-${Date.now()}@entoo.cz`;
    return this;
  }

  admin() {
    this.data.role = 'admin';
    return this;
  }

  build(): User {
    return {
      email: this.data.email || `user-${Date.now()}@entoo.cz`,
      password: this.data.password || 'password123',
      name: this.data.name || 'Test User',
      role: this.data.role || 'user',
    };
  }
}

// Usage
const adminUser = UserBuilder.create().admin().withEmail('admin@test.com').build();
const largeFile = FileBuilder.create().large().withSubject('Math').build();
```

**Benefits:**
- Fluent, readable test data creation
- Default values for common scenarios
- Easy to create variations
- Chainable methods

---

## Step 5: Create Custom Matchers

**Goal:** Domain-specific assertions

### Current State
```typescript
const star = page.locator('.favorite-star');
const classes = await star.getAttribute('class');
expect(classes).toContain('favorited');
```

### Optimized State
```typescript
// Custom matcher
expect.extend({
  async toBeMarkedAsFavorite(locator: Locator) {
    const classes = await locator.getAttribute('class');
    const pass = classes?.includes('favorited') || false;

    return {
      pass,
      message: () => pass
        ? `Expected element not to be marked as favorite`
        : `Expected element to be marked as favorite`,
    };
  },
});

// Use in tests
await expect(star).toBeMarkedAsFavorite();
```

### Custom Matchers Library

Create [matchers/index.ts](tests/matchers/index.ts):
```typescript
import { expect as baseExpect, Locator } from '@playwright/test';

export const expect = baseExpect.extend({
  // Favorite matchers
  async toBeMarkedAsFavorite(locator: Locator) {
    const classes = await locator.getAttribute('class');
    const pass = classes?.includes('favorited') || false;
    return {
      pass,
      message: () => `Expected ${pass ? 'not ' : ''}to be favorited`,
    };
  },

  // File upload matchers
  async toShowUploadSuccess(page: Page) {
    const success = await page.locator('.alert-success:has-text("uploaded")').isVisible();
    return {
      pass: success,
      message: () => `Expected upload ${success ? 'not ' : ''}to succeed`,
    };
  },

  // Search matchers
  async toHaveSearchResults(page: Page, count: number) {
    const results = await page.locator('.search-result-item').count();
    const pass = results === count;
    return {
      pass,
      message: () => `Expected ${count} results, got ${results}`,
    };
  },

  // File tree matchers
  async toHaveFilesInCategory(page: Page, subjectName: string, category: string, count: number) {
    const fileTree = new FileTreeComponent(page);
    const actualCount = await fileTree.getFileCount(subjectName, category);
    const pass = actualCount === count;
    return {
      pass,
      message: () => `Expected ${count} files in ${category}, got ${actualCount}`,
    };
  },
});
```

**Benefits:**
- More expressive tests
- Better error messages
- Domain-specific language
- Reusable assertions

---

## Step 6: Build Test Utilities Library

**Goal:** Centralize common test operations

### Current State
```typescript
// Scattered utility functions
await page.waitForTimeout(500);
await page.waitForSelector('.element');
await page.click('.button');
```

### Optimized State
```typescript
// Centralized utilities
class TestUtils {
  static async waitForStableState(page: Page) {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);
  }

  static async retryUntilSuccess<T>(
    fn: () => Promise<T>,
    maxRetries = 3
  ): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    throw new Error('Max retries exceeded');
  }

  static generateTestEmail() {
    return `test-${Date.now()}-${Math.random().toString(36).substring(7)}@entoo.cz`;
  }
}
```

### Utility Categories

Create [utils/](tests/utils/):

**utils/wait.utils.ts:**
```typescript
export class WaitUtils {
  static async forElement(page: Page, selector: string, timeout = 5000) {
    await page.waitForSelector(selector, { timeout });
  }

  static async forElementToDisappear(page: Page, selector: string) {
    await page.waitForSelector(selector, { state: 'hidden' });
  }

  static async forStableDOM(page: Page) {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);
  }

  static async forApiResponse(page: Page, urlPattern: string | RegExp) {
    return await page.waitForResponse(urlPattern);
  }
}
```

**utils/retry.utils.ts:**
```typescript
export class RetryUtils {
  static async withRetry<T>(
    fn: () => Promise<T>,
    options: {
      maxRetries?: number;
      delay?: number;
      onRetry?: (error: Error, attempt: number) => void;
    } = {}
  ): Promise<T> {
    const { maxRetries = 3, delay = 1000, onRetry } = options;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxRetries) throw error;
        onRetry?.(error as Error, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Unreachable');
  }
}
```

**utils/data.utils.ts:**
```typescript
export class DataUtils {
  static generateEmail(prefix = 'test') {
    return `${prefix}-${Date.now()}-${this.randomString(6)}@entoo.cz`;
  }

  static randomString(length = 10) {
    return Math.random().toString(36).substring(2, length + 2);
  }

  static randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static createTestFileName(extension = 'pdf') {
    return `test-${Date.now()}-${this.randomString(6)}.${extension}`;
  }
}
```

**Benefits:**
- DRY principle
- Consistent behavior
- Easy to maintain
- Better error handling

---

## Step 7: Optimize Parallel Execution

**Goal:** Maximize test speed while maintaining reliability

### Current Configuration
```typescript
// playwright.config.ts
workers: 1, // Sequential execution
```

### Optimized Configuration
```typescript
workers: process.env.CI ? 2 : 4, // Parallel execution

// Test isolation
projects: [
  {
    name: 'auth-tests',
    testMatch: /auth\.spec\.ts/,
    workers: 1, // Sequential for auth tests
  },
  {
    name: 'file-tests',
    testMatch: /file-.*\.spec\.ts/,
    workers: 4, // Parallel for file tests
  },
],
```

### Test Isolation Strategy

**1. Use test.describe.configure():**
```typescript
test.describe.configure({ mode: 'parallel' });

test.describe('File Upload', () => {
  test('upload PDF', async () => { /* ... */ });
  test('upload DOCX', async () => { /* ... */ });
  // These run in parallel
});

test.describe.configure({ mode: 'serial' });

test.describe('User Flow', () => {
  test('step 1: login', async () => { /* ... */ });
  test('step 2: upload', async () => { /* ... */ });
  test('step 3: verify', async () => { /* ... */ });
  // These run sequentially
});
```

**2. Isolate test data:**
```typescript
test('upload file', async ({ page }) => {
  // Use unique names to avoid conflicts
  const subject = `Test-${Date.now()}`;
  const filename = `file-${Math.random()}.pdf`;

  await uploadFile(page, subject, filename);
});
```

**3. Use test.describe.parallel():**
```typescript
test.describe.parallel('Independent Tests', () => {
  // Each test runs in parallel
});
```

**Benefits:**
- Faster test execution
- Better CI/CD performance
- Scalable test suite

---

## Step 8: Add Visual Regression Testing

**Goal:** Catch visual bugs automatically

### Implementation

```typescript
import { test } from '@playwright/test';

test('dashboard visual regression', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveScreenshot('dashboard.png', {
    maxDiffPixels: 100,
  });
});

test('subject profile modal', async ({ page }) => {
  await page.goto('/dashboard');
  await page.click('.subject-row:first-child');
  await page.click('[data-testid="view-profile"]');

  const modal = page.locator('#subjectProfileModal');
  await expect(modal).toHaveScreenshot('subject-profile-modal.png');
});
```

### Visual Testing Strategy

Create [tests/visual/](tests/visual/):
```typescript
test.describe('Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
  });

  test('homepage', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveScreenshot();
  });

  test('dashboard - light theme', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveScreenshot('dashboard-light.png');
  });

  test('dashboard - dark theme', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('#themeToggle');
    await expect(page).toHaveScreenshot('dashboard-dark.png');
  });

  test('upload modal', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('#uploadFileBtn');
    const modal = page.locator('#uploadModal');
    await expect(modal).toHaveScreenshot('upload-modal.png');
  });
});
```

**Benefits:**
- Catch CSS regressions
- Verify responsive design
- Document expected UI
- Cross-browser consistency

---

## Step 9: Implement Performance Monitoring

**Goal:** Track and alert on performance regressions

### Implementation

```typescript
test('dashboard load performance', async ({ page }) => {
  const startTime = Date.now();

  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');

  const loadTime = Date.now() - startTime;

  // Assert performance budget
  expect(loadTime).toBeLessThan(3000); // 3 seconds

  // Log for tracking
  console.log(`Dashboard load time: ${loadTime}ms`);
});
```

### Performance Testing Utilities

Create [utils/performance.utils.ts](tests/utils/performance.utils.ts):
```typescript
export class PerformanceUtils {
  static async measurePageLoad(page: Page, url: string) {
    const startTime = Date.now();
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    return Date.now() - startTime;
  }

  static async measureOperation<T>(
    operation: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    const startTime = Date.now();
    const result = await operation();
    const duration = Date.now() - startTime;
    return { result, duration };
  }

  static async getWebVitals(page: Page) {
    return await page.evaluate(() => ({
      FCP: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
      LCP: performance.getEntriesByType('largest-contentful-paint')[0]?.startTime,
      CLS: performance.getEntriesByType('layout-shift'),
    }));
  }
}
```

**Benefits:**
- Performance budgets
- Regression detection
- Performance metrics
- Historical tracking

---

## Step 10: Enhance CI/CD Integration

**Goal:** Reliable, fast, informative CI pipeline

### GitHub Actions Workflow

Create [.github/workflows/e2e-tests.yml](.github/workflows/e2e-tests.yml):
```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: |
          cd tests
          npm ci
          npx playwright install --with-deps

      - name: Start application
        run: docker-compose up -d

      - name: Wait for application
        run: npx wait-on http://localhost:8000 --timeout 120000

      - name: Run E2E tests
        run: |
          cd tests
          npm run test:clean

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: tests/playwright-report/

      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: screenshots
          path: tests/test-results/
```

### Test Reporting

```typescript
// playwright.config.ts
reporter: [
  ['html'],
  ['json', { outputFile: 'test-results/results.json' }],
  ['junit', { outputFile: 'test-results/junit.xml' }],
  ['github'], // GitHub Actions integration
],
```

**Benefits:**
- Automated testing
- Quick feedback
- Test reports
- Artifact storage

---

## Migration Strategy

### Phase 1: Foundation (Week 1)
- [ ] Create base page objects for main pages
- [ ] Set up custom fixtures
- [ ] Implement test utilities

### Phase 2: Components (Week 2)
- [ ] Create component objects
- [ ] Implement data builders
- [ ] Add custom matchers

### Phase 3: Optimization (Week 3)
- [ ] Enable parallel execution
- [ ] Add visual regression tests
- [ ] Implement performance monitoring

### Phase 4: CI/CD (Week 4)
- [ ] Set up GitHub Actions
- [ ] Configure test reporting
- [ ] Add cleanup automation

---

## Measuring Success

### Metrics to Track

1. **Test Execution Time**
   - Before: ~15 minutes for full suite
   - Target: <5 minutes

2. **Test Reliability**
   - Before: 75% pass rate
   - Target: >95% pass rate

3. **Code Reusability**
   - Before: 60% duplication
   - Target: <20% duplication

4. **Maintainability**
   - Before: 2 hours to update tests after UI change
   - Target: <30 minutes

---

## Quick Wins

Start with these high-impact, low-effort improvements:

1. **Extract common selectors** to constants
2. **Create auth fixture** for automatic login
3. **Add cleanup hook** to all test suites
4. **Enable parallel execution** for independent tests
5. **Add performance assertions** to critical paths

---

## Resources

- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Page Object Model Guide](https://playwright.dev/docs/pom)
- [Test Fixtures Documentation](https://playwright.dev/docs/test-fixtures)
- [Custom Matchers](https://playwright.dev/docs/test-assertions#extend-assertions)

---

## Summary

These 10 steps provide a comprehensive roadmap for optimizing the Entoo2 E2E test suite:

1. **POM** - Encapsulate page logic
2. **Components** - Reusable UI components
3. **Fixtures** - Standardize setup/teardown
4. **Builders** - Programmatic test data
5. **Matchers** - Domain-specific assertions
6. **Utilities** - Centralize common operations
7. **Parallelization** - Faster execution
8. **Visual Testing** - Catch visual bugs
9. **Performance** - Monitor regressions
10. **CI/CD** - Automate everything

**Start small, iterate often, measure progress.**
