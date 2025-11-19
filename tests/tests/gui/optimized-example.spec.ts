/**
 * Optimized Test Example
 * Demonstrates the new test framework with Page Objects, Fixtures, Builders, and Custom Matchers
 *
 * BEFORE vs AFTER comparison
 */

import { test, expect } from '../../fixtures';
import { DashboardPage, LoginPage, UploadModalPage } from '../../pages';
import { FileBuilder, UserBuilder } from '../../builders';
import { expect as customExpect } from '../../matchers';
import { WaitUtils, PerformanceUtils } from '../../utils';

/**
 * EXAMPLE 1: Authentication with Page Objects
 *
 * BEFORE:
 * - Direct page interactions
 * - Repeated selector definitions
 * - Manual waiting
 *
 * AFTER:
 * - Page Object encapsulation
 * - Reusable methods
 * - Clean, readable code
 */
test.describe('Authentication (Optimized)', () => {
  test('login with page object', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login('user1@entoo.cz', 'password');

    // Use custom matcher
    await customExpect(page).toBeAuthenticated();
    await expect(page).toHaveURL(/dashboard/);
  });

  test('register with builder', async ({ page }) => {
    const registerPage = new LoginPage(page).registerLink;
    await registerPage.click();

    // Use data builder for test user
    const testUser = UserBuilder.create()
      .withRandomEmail()
      .withName('Test User')
      .withPassword('password123')
      .build();

    await page.fill('input[name="name"]', testUser.name);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="password_confirmation"]', testUser.passwordConfirmation!);

    await page.click('button[type="submit"]');

    // Should redirect to dashboard or login
    await page.waitForURL(/\/(dashboard|login)/, { timeout: 5000 });
  });
});

/**
 * EXAMPLE 2: Dashboard with Fixtures
 *
 * BEFORE:
 * - Manual authentication setup
 * - Repeated navigation code
 * - Complex waiting logic
 *
 * AFTER:
 * - Automatic authentication via fixture
 * - Pre-loaded dashboard
 * - Clean test focus
 */
test.describe('Dashboard (Optimized)', () => {
  test('explore subjects with page object', async ({ dashboardPage }) => {
    // dashboardPage fixture automatically authenticates and loads dashboard

    const subjects = await dashboardPage.getAllSubjectNames();
    expect(subjects.length).toBeGreaterThan(0);

    // Expand first subject
    const firstSubject = subjects[0];
    await dashboardPage.expandSubject(firstSubject);

    // Select a category
    await dashboardPage.selectCategory('Prednasky');

    // Verify dashboard is loaded
    await customExpect(dashboardPage.page).toShowDashboard();
  });

  test('toggle favorite with component', async ({ dashboardPage, favoriteStar }) => {
    const subjects = await dashboardPage.getAllSubjectNames();
    const testSubject = subjects[0];

    // Use FavoriteStarComponent
    const wasFavorited = await favoriteStar.isFavorited(testSubject);

    await favoriteStar.toggle(testSubject);
    await WaitUtils.delay(500);

    const isFavorited = await favoriteStar.isFavorited(testSubject);
    expect(isFavorited).toBe(!wasFavorited);

    // Use custom matcher
    const star = favoriteStar.getFavoriteStar(testSubject);
    if (isFavorited) {
      await customExpect(star).toBeMarkedAsFavorite();
    }
  });
});

/**
 * EXAMPLE 3: Search with Components
 *
 * BEFORE:
 * - Direct element counting
 * - Manual result validation
 * - Scattered selectors
 *
 * AFTER:
 * - SearchResultsComponent abstraction
 * - Custom matchers for assertions
 * - Reusable search logic
 */
test.describe('Search (Optimized)', () => {
  test('search with results component', async ({ dashboardPage, searchResults }) => {
    // Perform search
    await dashboardPage.search('matematika');

    // Use SearchResultsComponent
    const isVisible = await searchResults.isVisible();
    expect(isVisible).toBe(true);

    const count = await searchResults.getResultCount();
    expect(count).toBeGreaterThan(0);

    // Use custom matcher
    await customExpect(dashboardPage.page).toHaveAtLeastSearchResults(1);

    // Get result details
    const titles = await searchResults.getResultTitles();
    expect(titles.length).toBe(count);
  });
});

/**
 * EXAMPLE 4: File Upload with Builders and Fixtures
 *
 * BEFORE:
 * - Manual file creation
 * - Hardcoded file paths
 * - Complex modal interactions
 * - Manual cleanup
 *
 * AFTER:
 * - FileBuilder for test data
 * - testFile fixture auto-creates/cleans up
 * - UploadModalPage encapsulation
 * - Custom matchers for validation
 */
test.describe('File Upload (Optimized)', () => {
  test('upload with builder and fixtures', async ({ dashboardPage, uploadModalPage, testPdfFile }) => {
    // Expand first subject with files
    const subjects = await dashboardPage.getAllSubjectNames();
    const firstSubject = subjects[0];

    await dashboardPage.expandSubject(firstSubject);
    await dashboardPage.selectCategory('Materialy');

    // Open upload modal
    await dashboardPage.openUploadModal();
    await uploadModalPage.waitForOpen();

    // Upload using fixture-provided test file
    await uploadModalPage.uploadFile(testPdfFile.path);

    // Use custom matcher
    await customExpect(dashboardPage.page).toShowUploadSuccess();
  });

  test('create custom file with builder', async ({ dashboardPage, uploadModalPage }) => {
    // Use FileBuilder to create custom test file
    const customFile = FileBuilder.create()
      .asPdf()
      .large()
      .withSubject('Mathematics')
      .withName('custom-test.pdf')
      .buildAndCreate();

    try {
      const subjects = await dashboardPage.getAllSubjectNames();
      await dashboardPage.expandSubject(subjects[0]);
      await dashboardPage.selectCategory('Materialy');

      await dashboardPage.openUploadModal();
      await uploadModalPage.uploadFile(customFile.path);

      // Wait for success
      const success = await uploadModalPage.waitForSuccess();
      expect(success).toBe(true);
    } finally {
      // Cleanup custom file
      if (customFile.path) {
        const fs = require('fs');
        if (fs.existsSync(customFile.path)) {
          fs.unlinkSync(customFile.path);
        }
      }
    }
  });
});

/**
 * EXAMPLE 5: Performance Testing with Utilities
 *
 * BEFORE:
 * - Manual timestamp calculations
 * - No performance tracking
 * - Hardcoded performance expectations
 *
 * AFTER:
 * - PerformanceUtils for measurements
 * - Automated performance budgets
 * - Web Vitals tracking
 */
test.describe('Performance (Optimized)', () => {
  test('measure dashboard load performance', async ({ page }) => {
    const measurement = await PerformanceUtils.measurePageLoad(page, 'http://localhost:8000/dashboard');

    // Assert performance budget (5 seconds)
    PerformanceUtils.assertBudget(measurement, 5000);

    // Log measurement
    PerformanceUtils.logMeasurement('Dashboard Load', measurement, 5000);

    // Get Web Vitals
    const vitals = await PerformanceUtils.getWebVitals(page);
    console.log('Web Vitals:', vitals);

    // FCP should be under 3 seconds
    if (vitals.FCP) {
      expect(vitals.FCP).toBeLessThan(3000);
    }
  });

  test('measure search operation', async ({ dashboardPage }) => {
    const { result, measurement } = await PerformanceUtils.measureOperation(async () => {
      await dashboardPage.search('matematika');
      return await dashboardPage.getSearchResultsCount();
    });

    console.log(`Search completed in ${measurement.duration}ms with ${result} results`);

    // Search should complete within 2 seconds
    PerformanceUtils.assertBudget(measurement, 2000);
  });
});

/**
 * EXAMPLE 6: Component Interactions
 *
 * BEFORE:
 * - Repeated modal interaction code
 * - Complex visibility checks
 * - No reusable patterns
 *
 * AFTER:
 * - ModalComponent for generic modals
 * - AlertComponent for messages
 * - FileTreeComponent for navigation
 */
test.describe('Component Interactions (Optimized)', () => {
  test('interact with file tree component', async ({ dashboardPage, fileTree }) => {
    // FileTreeComponent makes tree navigation easy
    await fileTree.waitForLoad();

    const subjects = await fileTree.getAllSubjectNames();
    expect(subjects.length).toBeGreaterThan(0);

    const firstSubject = subjects[0];
    await fileTree.expandSubject(firstSubject);

    const fileCount = await fileTree.getSubjectFileCount(firstSubject);
    console.log(`${firstSubject} has ${fileCount} files`);
  });

  test('work with alerts component', async ({ dashboardPage, alerts }) => {
    // Trigger an action that might show alerts
    const subjects = await dashboardPage.getAllSubjectNames();
    await dashboardPage.expandSubject(subjects[0]);
    await dashboardPage.selectCategory('Materialy');

    // AlertComponent provides easy alert checking
    const hasSuccess = await alerts.hasSuccess();
    const hasError = await alerts.hasError();

    console.log(`Success alert: ${hasSuccess}, Error alert: ${hasError}`);
  });
});

/**
 * KEY IMPROVEMENTS DEMONSTRATED:
 *
 * 1. ✅ Page Object Model - Encapsulated page interactions
 * 2. ✅ Fixtures - Automatic setup/teardown
 * 3. ✅ Data Builders - Fluent test data creation
 * 4. ✅ Custom Matchers - Domain-specific assertions
 * 5. ✅ Components - Reusable UI elements
 * 6. ✅ Utilities - Common operations centralized
 * 7. ✅ Performance - Built-in performance testing
 * 8. ✅ Cleanup - Automatic test data cleanup
 *
 * BENEFITS:
 * - 📖 More readable tests
 * - 🔧 Easier to maintain
 * - 🚀 Better performance tracking
 * - ♻️ High code reusability
 * - 🧪 Type-safe test data
 * - 🎯 Focused test logic
 */
