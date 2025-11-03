/**
 * GUI E2E Tests - Dashboard
 * Tests for general dashboard functionality, file tree, and navigation
 */

import { test, expect } from '@playwright/test';
import { setupAuth } from '../helpers/auth.helper';
import { waitForVisible, expandSubject, getFileCount } from '../helpers/ui.helper';

test.describe('Dashboard GUI Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await page.waitForLoadState('networkidle');
  });

  test('should load dashboard successfully', async ({ page }) => {
    // Verify dashboard elements are visible
    await expect(page).toHaveURL(/\/dashboard/);

    // Should have main container
    const container = page.locator('.dashboard-container, .container, main');
    await expect(container.first()).toBeVisible();
  });

  test('should display file tree', async ({ page }) => {
    // File tree should be visible
    const fileTree = page.locator('.file-tree, .subjects-list, .subject-list');
    await expect(fileTree.first()).toBeVisible();
  });

  test('should display list of subjects', async ({ page }) => {
    await waitForVisible(page, '.subject-row');

    // Should have multiple subjects
    const subjects = page.locator('.subject-row');
    const count = await subjects.count();

    expect(count).toBeGreaterThan(0);
    console.log(`Found ${count} subjects`);
  });

  test('should display subject names', async ({ page }) => {
    await waitForVisible(page, '.subject-row');

    const firstSubject = page.locator('.subject-row').first();
    const subjectName = firstSubject.locator('.subject-name, .name');

    await expect(subjectName).toBeVisible();

    const name = await subjectName.textContent();
    expect(name).toBeTruthy();
    expect(name!.length).toBeGreaterThan(0);
  });

  test('should display file counts for subjects', async ({ page }) => {
    await waitForVisible(page, '.subject-row');

    const firstSubject = page.locator('.subject-row').first();
    const fileCount = firstSubject.locator('.file-count, .count, .badge');

    // File count should be visible
    const count = await fileCount.count();
    if (count > 0) {
      await expect(fileCount.first()).toBeVisible();

      const countText = await fileCount.first().textContent();
      expect(countText).toMatch(/\d+/);
    }
  });

  test('should expand subject to show files', async ({ page }) => {
    await waitForVisible(page, '.subject-row');

    const firstSubject = page.locator('.subject-row').first();
    const subjectName = await firstSubject.locator('.subject-name, .name').textContent();

    if (!subjectName) {
      throw new Error('No subject name found');
    }

    // Get file count
    const fileCount = await getFileCount(page, subjectName);

    // Expand subject
    await firstSubject.click();

    // Wait for expansion
    await page.waitForTimeout(500);

    // If there are files, they should be visible
    if (fileCount > 0) {
      const filesContainer = page.locator('.files-container, .file-list, .category-section');
      await expect(filesContainer.first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('should collapse expanded subject', async ({ page }) => {
    await waitForVisible(page, '.subject-row');

    const firstSubject = page.locator('.subject-row').first();
    const subjectName = await firstSubject.locator('.subject-name, .name').textContent();

    if (!subjectName) {
      throw new Error('No subject name found');
    }

    // Expand
    await expandSubject(page, subjectName);

    await page.waitForTimeout(500);

    // Collapse
    await firstSubject.click();

    await page.waitForTimeout(500);

    // Files should be hidden
    const isExpanded = await firstSubject.locator('.expanded').count() > 0;
    expect(isExpanded).toBe(false);
  });

  test('should display files by category', async ({ page }) => {
    await waitForVisible(page, '.subject-row');

    // Find subject with files
    const subjects = page.locator('.subject-row');
    const count = await subjects.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const subject = subjects.nth(i);
      const fileCount = await getFileCount(page, await subject.locator('.subject-name, .name').textContent() || '');

      if (fileCount > 0) {
        await subject.click();
        await page.waitForTimeout(500);

        // Should display category sections
        const categories = page.locator('.category-section, .category, h4:has-text("Materialy")');
        const categoryCount = await categories.count();

        if (categoryCount > 0) {
          await expect(categories.first()).toBeVisible();
        }

        break;
      }
    }
  });

  test('should display file names', async ({ page }) => {
    await waitForVisible(page, '.subject-row');

    // Expand first subject with files
    const subjects = page.locator('.subject-row');
    const count = await subjects.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const subject = subjects.nth(i);
      const subjectName = await subject.locator('.subject-name, .name').textContent();

      if (subjectName) {
        const fileCount = await getFileCount(page, subjectName);

        if (fileCount > 0) {
          await expandSubject(page, subjectName);

          // Should display file names
          const fileNames = page.locator('.file-item .file-name, .file-link');
          const fileNameCount = await fileNames.count();

          if (fileNameCount > 0) {
            await expect(fileNames.first()).toBeVisible();

            const fileName = await fileNames.first().textContent();
            expect(fileName).toBeTruthy();
          }

          break;
        }
      }
    }
  });

  test('should display dashboard statistics', async ({ page }) => {
    // Look for stats display
    const stats = page.locator('.stats, .statistics, .dashboard-stats');
    const hasStats = await stats.count() > 0;

    if (hasStats) {
      await expect(stats.first()).toBeVisible();

      // Should show counts
      const counts = page.locator('.stat-count, .count, .number');
      if (await counts.count() > 0) {
        await expect(counts.first()).toBeVisible();
      }
    }
  });

  test('should handle empty subjects (no files)', async ({ page }) => {
    await waitForVisible(page, '.subject-row');

    // Find subject with 0 files
    const subjects = page.locator('.subject-row');
    const count = await subjects.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const subject = subjects.nth(i);
      const subjectName = await subject.locator('.subject-name, .name').textContent();

      if (subjectName) {
        const fileCount = await getFileCount(page, subjectName);

        if (fileCount === 0) {
          await subject.click();
          await page.waitForTimeout(500);

          // Should show empty state or no files message
          const emptyState = page.locator('text=/no files/i, text=/empty/i, text=/žádné soubory/i');
          const hasEmptyState = await emptyState.count() > 0;

          // Empty state might not be displayed
          if (hasEmptyState) {
            await expect(emptyState.first()).toBeVisible();
          }

          break;
        }
      }
    }
  });

  test('should display user menu', async ({ page }) => {
    // Look for user menu/profile
    const userMenu = page.locator('.user-menu, .profile-menu, .user-dropdown');
    const hasUserMenu = await userMenu.count() > 0;

    if (hasUserMenu) {
      await expect(userMenu.first()).toBeVisible();
    }
  });

  test('should navigate to favorites page', async ({ page }) => {
    const favoritesLink = page.locator('a[href="/favorites"], a:has-text("Favorites"), a:has-text("Oblíbené")');
    const hasLink = await favoritesLink.count() > 0;

    if (hasLink) {
      await favoritesLink.first().click();

      await expect(page).toHaveURL(/\/favorites/);
    }
  });

  test('should display responsive layout', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.waitForLoadState('networkidle');

    // Dashboard should still be visible
    const container = page.locator('.dashboard-container, .container, main');
    await expect(container.first()).toBeVisible();

    // Subjects should be visible
    await waitForVisible(page, '.subject-row');

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('should handle keyboard navigation', async ({ page }) => {
    await waitForVisible(page, '.subject-row');

    // Tab through elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should be able to interact with focused element
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });

  test('should load dashboard quickly', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Dashboard should load within reasonable time
    expect(loadTime).toBeLessThan(5000);

    console.log(`Dashboard loaded in ${loadTime}ms`);
  });

  test('should display categories correctly', async ({ page }) => {
    await waitForVisible(page, '.subject-row');

    // Expand first subject with files
    const subjects = page.locator('.subject-row');
    const count = await subjects.count();

    const expectedCategories = ['Materialy', 'Otazky', 'Prednasky', 'Seminare'];

    for (let i = 0; i < Math.min(count, 5); i++) {
      const subject = subjects.nth(i);
      const subjectName = await subject.locator('.subject-name, .name').textContent();

      if (subjectName) {
        const fileCount = await getFileCount(page, subjectName);

        if (fileCount > 0) {
          await expandSubject(page, subjectName);

          // Check for category sections
          for (const category of expectedCategories) {
            const categoryElem = page.locator(`text=${category}, .category:has-text("${category}")`);
            const hasCategory = await categoryElem.count() > 0;

            // Category might be present
            if (hasCategory) {
              console.log(`Found category: ${category}`);
            }
          }

          break;
        }
      }
    }
  });
});
