## Test Optimization Framework

This directory contains the optimized E2E test framework for Entoo2, implementing the Page Object Model (POM) pattern and best practices from the Test Optimization Guide.

## Directory Structure

```
tests/
├── pages/              # Page Object Models
├── components/         # Reusable UI Components
├── fixtures/           # Custom Test Fixtures
├── builders/           # Test Data Builders
├── matchers/           # Custom Matchers
├── utils/              # Test Utilities
└── tests/              # Test Specifications
```

## Quick Start

### Using Page Objects

```typescript
import { test, expect } from '../fixtures';

test('login with page object', async ({ loginPage }) => {
  await loginPage.login('user@example.com', 'password');
  await expect(loginPage.page).toHaveURL(/dashboard/);
});
```

### Using Fixtures

```typescript
import { test, expect } from '../fixtures';

test('dashboard is loaded', async ({ dashboardPage }) => {
  // dashboardPage is already authenticated and loaded
  await expect(dashboardPage).toShowDashboard();
});
```

### Using Data Builders

```typescript
import { FileBuilder, UserBuilder } from '../builders';

const testFile = FileBuilder.create()
  .asPdf()
  .large()
  .withSubject('Mathematics')
  .prednasky()
  .buildAndCreate();

const testUser = UserBuilder.create()
  .withRandomEmail()
  .withPassword('password123')
  .build();
```

### Using Custom Matchers

```typescript
import { expect } from '../matchers';

await expect(page).toShowUploadSuccess();
await expect(page).toHaveSearchResults(5);
await expect(favoriteStar).toBeMarkedAsFavorite();
```

### Using Components

```typescript
import { FileTreeComponent, AlertComponent } from '../components';

const fileTree = new FileTreeComponent(page);
await fileTree.expandSubject('Mathematics');
await fileTree.selectCategory('Mathematics', 'Prednasky');

const alerts = new AlertComponent(page);
await alerts.waitForSuccess();
```

### Using Utilities

```typescript
import { WaitUtils, DataUtils, PerformanceUtils } from '../utils';

// Wait utilities
await WaitUtils.forElement(page, '.subject-row');
await WaitUtils.forStableDOM(page);

// Data utilities
const email = DataUtils.generateEmail('test');
const fileName = DataUtils.createTestFileName('pdf');

// Performance utilities
const measurement = await PerformanceUtils.measurePageLoad(page, '/dashboard');
PerformanceUtils.assertBudget(measurement, 3000); // 3 second budget
```

## Available Page Objects

### DashboardPage
Main dashboard with file tree, search, and navigation.

**Methods:**
- `goto()` - Navigate to dashboard
- `waitForSubjectsToLoad()` - Wait for subjects
- `expandSubject(name)` - Expand a subject
- `selectCategory(category)` - Select category tab
- `toggleFavorite(subject)` - Toggle favorite
- `search(query)` - Perform search
- `openUploadModal()` - Open upload modal
- `logout()` - Logout user

### LoginPage
Login page interactions.

**Methods:**
- `goto()` - Navigate to login
- `login(email, password)` - Perform login
- `hasError()` - Check for error
- `goToRegister()` - Navigate to register

### RegisterPage
Registration page interactions.

**Methods:**
- `goto()` - Navigate to registration
- `register(name, email, password)` - Register user
- `hasError()` - Check for error
- `goToLogin()` - Navigate to login

### UploadModalPage
File upload modal interactions.

**Methods:**
- `uploadFile(filePath)` - Upload a file
- `waitForSuccess()` - Wait for upload success
- `hasError()` - Check for upload error
- `close()` - Close modal

## Available Components

### FileTreeComponent
File tree navigation and interaction.

### AlertComponent
Success/error/info alert handling.

### FavoriteStarComponent
Favorite toggle functionality.

### SearchResultsComponent
Search results display and interaction.

### ModalComponent
Generic modal interactions.

## Available Builders

### FileBuilder
Create test files with fluent API.

**Example:**
```typescript
const file = FileBuilder.create()
  .asPdf()              // PDF file
  .large()              // 10MB
  .materialy()          // Category: Materialy
  .withSubject('Math')  // Subject name
  .buildAndCreate();    // Create on disk
```

### UserBuilder
Create test users with fluent API.

**Example:**
```typescript
const user = UserBuilder.create()
  .withRandomEmail()
  .withPassword('test123')
  .valid()
  .build();
```

## Available Utilities

### WaitUtils
- `forElement(page, selector)` - Wait for element
- `forStableDOM(page)` - Wait for network idle
- `forApiResponse(page, pattern)` - Wait for API
- `forCondition(fn)` - Wait for condition

### RetryUtils
- `withRetry(fn, options)` - Retry with backoff
- `untilCondition(fn)` - Retry until true
- `poll(fn, options)` - Poll until success

### DataUtils
- `generateEmail(prefix)` - Generate unique email
- `randomString(length)` - Random string
- `createTestFileName(ext)` - Test file name
- `createTestPdf(name)` - Create PDF file

### PerformanceUtils
- `measurePageLoad(page, url)` - Measure load time
- `measureOperation(fn)` - Measure duration
- `getWebVitals(page)` - Get web vitals
- `assertBudget(measurement, budget)` - Assert performance

## Custom Matchers

- `toBeMarkedAsFavorite()` - Check if favorited
- `toShowUploadSuccess()` - Check upload success
- `toShowUploadError()` - Check upload error
- `toHaveSearchResults(count)` - Check result count
- `toHaveFilesInCategory(subject, category, count)` - Check file count
- `toShowDashboard()` - Check dashboard visible
- `toBeAuthenticated()` - Check if authenticated
- `toShowModal(selector)` - Check modal visible
- `toShowError(text?)` - Check error message
- `toShowSuccess(text?)` - Check success message
- `toHaveLoadedFileTree()` - Check tree loaded
- `toHaveSubject(name)` - Check subject exists

## Best Practices

### 1. Use Fixtures for Setup
```typescript
test('example', async ({ dashboardPage, testFile }) => {
  // Already authenticated and on dashboard
  // Test file already created
});
```

### 2. Use Page Objects for Interactions
```typescript
// ❌ Don't
await page.click('.subject-row');

// ✅ Do
await dashboardPage.expandSubject('Mathematics');
```

### 3. Use Custom Matchers
```typescript
// ❌ Don't
const classes = await star.getAttribute('class');
expect(classes).toContain('favorited');

// ✅ Do
await expect(star).toBeMarkedAsFavorite();
```

### 4. Use Builders for Test Data
```typescript
// ❌ Don't
const file = { name: 'test.pdf', subject: 'Math', ... };

// ✅ Do
const file = FileBuilder.create().asPdf().withSubject('Math').build();
```

### 5. Use Utilities for Common Operations
```typescript
// ❌ Don't
await page.waitForTimeout(1000);
await page.waitForSelector('.element');

// ✅ Do
await WaitUtils.forElement(page, '.element');
```

## Migration Guide

### Converting Existing Tests

**Before:**
```typescript
test('upload file', async ({ page }) => {
  await setupAuth(page);
  await page.goto('/dashboard');
  await page.click('#uploadFileBtn');
  await page.setInputFiles('#fileInput', 'test.pdf');
  await page.click('#uploadBtn');
  await page.waitForSelector('.alert-success');
});
```

**After:**
```typescript
test('upload file', async ({ dashboardPage, uploadModalPage, testPdfFile }) => {
  await dashboardPage.openUploadModal();
  await uploadModalPage.uploadFile(testPdfFile.path);
  await expect(dashboardPage.page).toShowUploadSuccess();
});
```

## Performance Testing

```typescript
test('dashboard loads within budget', async ({ page }) => {
  const measurement = await PerformanceUtils.measurePageLoad(page, '/dashboard');

  PerformanceUtils.assertBudget(measurement, 3000); // 3s budget
  PerformanceUtils.logMeasurement('Dashboard Load', measurement, 3000);

  const vitals = await PerformanceUtils.getWebVitals(page);
  expect(vitals.FCP).toBeLessThan(2000); // FCP < 2s
});
```

## Parallel Execution

Tests using fixtures are automatically isolated and can run in parallel:

```typescript
test.describe.configure({ mode: 'parallel' });

test.describe('File Upload Tests', () => {
  test('upload PDF', async ({ dashboardPage }) => { /* ... */ });
  test('upload TXT', async ({ dashboardPage }) => { /* ... */ });
  // These run in parallel
});
```

## Documentation

- [Test Optimization Guide](TEST_OPTIMIZATION_GUIDE.md) - Complete optimization roadmap
- [Implementation Summary](IMPLEMENTATION_SUMMARY.md) - What was implemented
- [Cleanup Strategy](CLEANUP_STRATEGY.md) - Test data cleanup

## Support

For questions or issues with the test framework, see the documentation files or check the examples in `tests/gui/`.
