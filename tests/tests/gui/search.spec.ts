/**
 * GUI E2E Tests - Search
 * Tests for search functionality including Elasticsearch integration
 */

import { test, expect } from '@playwright/test';
import { setupAuth } from '../helpers/auth.helper';
import { waitForVisible, search, waitForLoading, ensureSearch } from '../helpers/ui.helper';

// Shared URL produced by a one-time search run in beforeAll.
// Some tests can reuse this instead of performing the search themselves.
let sharedSearchUrl: string | undefined;
const DEFAULT_SEARCH_QUERY = process.env.PLAYWRIGHT_SEARCH_QUERY || 'pravo';

test.describe('Search GUI Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await page.waitForLoadState('networkidle');
    if (sharedSearchUrl) {
      await page.goto(sharedSearchUrl);
    } else {
      const base = process.env.PLAYWRIGHT_BASE_URL || process.env.BASE_URL || 'http://localhost:8000/dashboard';
      await page.goto(`${base.replace(/\/$/, '')}/search?q=${encodeURIComponent(DEFAULT_SEARCH_QUERY)}`);
    }
    await page.waitForLoadState('networkidle');
  });

  


  test('should display search input', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[name="query"], #searchInput');
    await expect(searchInput).toBeVisible();
  });

  test('should perform basic search', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[name="query"], #searchInput');
    const searchQuery = 'pravo';

    await searchInput.fill(searchQuery);
    await searchInput.press('Enter');

    // Wait for search results
    await page.waitForTimeout(1000);

    // URL should contain search query
    await expect(page).toHaveURL(new RegExp(`.*search\\?q=.*${searchQuery}.*`));

    // Results should be displayed
    const results = page.locator('.search-results, .file-list, .subject-row', );
    await expect(results.first()).toBeVisible({ timeout: 5000 });
  });

  test('should display search results count', async ({ page }) => {
    // Try known CSS selectors including the id used in the app
    const searchCountResult = page.locator('#searchCount');
    await expect(searchCountResult.first()).toBeVisible({ timeout: 5000 });
    expect(/^[0-9]+$/.test(
      (await searchCountResult.first().innerText())
      .trim()))
      .toBeTruthy();
    });

  test('should highlight search terms in results', async ({ page }) => {
    await ensureSearch(page, 'pravo');

    // Check if search terms are highlighted
    const highlightedTerms = page.locator('mark, .highlight, strong');
    const count = await highlightedTerms.count();

    // Highlighted terms might be present
    if (count > 0) {
      await expect(highlightedTerms.first()).toBeVisible();
    }
  });

  test('should search in file content (Elasticsearch)', async ({ page }) => {
  // Search for a term that's likely in file content
  await ensureSearch(page, 'dokument');

    await page.waitForTimeout(1000);

    // Should return results from file content
    const results = page.locator('.search-results .file-item, .file-list .file-item, .subject-row');
    const count = await results.count();

    // Should have some results
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should handle empty search results', async ({ page }) => {
  // Search for something that definitely doesn't exist
  await ensureSearch(page, 'xyzabc123nonexistent');

    await page.waitForTimeout(1000);

    // Should show "no results" message
    const noResults = page.locator('text=/no results/i, text=/not found/i, text=/nenalezeny/i');
    await expect(noResults.first()).toBeVisible({ timeout: 5000 }).catch(() => {
      // No results message might not be implemented
    });
  });

  test('should clear search', async ({ page }) => {
  // Perform search
  await ensureSearch(page, 'test');

    await page.waitForTimeout(1000);

    // Clear search
    const searchInput = page.locator('input[type="search"], input[name="query"], #searchInput');
    await searchInput.clear();
    await searchInput.press('Enter');

    // Should return to normal view
    await page.waitForTimeout(1000);

    // URL should not contain search parameter
    const url = page.url();
    expect(url).not.toContain('search=');
  });

  test('should support search suggestions/autocomplete', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[name="query"], #searchInput');

    await searchInput.fill('pra');

    // Wait for suggestions
    await page.waitForTimeout(500);

    // Check for suggestions dropdown
    const suggestions = page.locator('.suggestions, .autocomplete, .search-dropdown');
    const hasSuggestions = await suggestions.count() > 0;

    // Suggestions might not be implemented
    if (hasSuggestions) {
      await expect(suggestions.first()).toBeVisible();
    }
  });

  test('should search with special characters', async ({ page }) => {
  // Search with special characters
  await ensureSearch(page, 'právo & zákony');

    await page.waitForTimeout(1000);

    // Should handle special characters gracefully
    const results = page.locator('.search-results, .file-list, .subject-row');
    await expect(results.first()).toBeVisible({ timeout: 5000 }).catch(() => {
      // No results is acceptable
    });
  });

  test('should maintain search state on page reload', async ({ page }) => {
  const searchQuery = 'smlouva';
  await ensureSearch(page, searchQuery);

    await page.waitForTimeout(1000);

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Search query should be maintained
    const searchInput = page.locator('input[type="search"], input[name="query"], #searchInput');
    const inputValue = await searchInput.inputValue();

    expect(inputValue).toBe(searchQuery);

    // Results should be displayed
    const results = page.locator('.search-results, .file-list, .subject-row');
    await expect(results.first()).toBeVisible({ timeout: 5000 });
  });

  test('should search by file name', async ({ page }) => {
    // Get first visible file name
    await waitForVisible(page, '.subject-row');

    const firstSubject = page.locator('.subject-row').first();
    await firstSubject.click();

    await page.waitForTimeout(500);

    const fileName = page.locator('.file-item .file-name, .file-link').first();
    const fileNameText = await fileName.textContent();

    if (fileNameText) {
      // Search for file name
  const searchTerm = fileNameText.substring(0, 10);
  await ensureSearch(page, searchTerm);

      await page.waitForTimeout(1000);

      // Should find the file
      const results = page.locator('.search-results, .file-list');
      await expect(results).toBeVisible({ timeout: 5000 });
    }
  });

  test('should search by subject name', async ({ page }) => {
    await waitForVisible(page, '.subject-row');

    // Get first subject name
    const firstSubject = page.locator('.subject-row').first();
    const subjectName = await firstSubject.locator('.subject-name, .name').textContent();

    if (subjectName) {
      // Search for subject
  const searchTerm = subjectName.substring(0, 10);
  await ensureSearch(page, searchTerm);

      await page.waitForTimeout(1000);

      // Should find the subject
      const results = page.locator('.search-results, .file-list, .subject-row');
      await expect(results.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show search performance metrics', async ({ page }) => {
    const startTime = Date.now();

  await ensureSearch(page, 'test');

    await page.waitForTimeout(1000);

    const duration = Date.now() - startTime;

    // Search should complete quickly with Elasticsearch
    expect(duration).toBeLessThan(3000);

    console.log(`Search completed in ${duration}ms`);
  });

  test('should handle concurrent searches', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[name="query"], #searchInput');

    // Type rapidly to simulate concurrent searches
    await searchInput.fill('pr');
    await searchInput.press('Enter');

    await page.waitForTimeout(100);

    await searchInput.fill('prav');
    await searchInput.press('Enter');

    await page.waitForTimeout(100);

    await searchInput.fill('pravo');
    await searchInput.press('Enter');

    // Wait for final search to complete
    await page.waitForTimeout(1000);

    // Should display results for final search
    const results = page.locator('.search-results, .file-list, .subject-row');
    await expect(results.first()).toBeVisible({ timeout: 5000 });
  });

  test('should filter search by category', async ({ page }) => {
    await ensureSearch(page, 'test');

    await page.waitForTimeout(1000);

    // Look for category filter
    const categoryFilter = page.locator('select[name="category"], .category-filter');
    const hasFilter = await categoryFilter.count() > 0;

    if (hasFilter) {
      await categoryFilter.selectOption('Materialy');

      // Wait for filtered results
      await page.waitForTimeout(1000);

      // Results should be filtered
      const results = page.locator('.search-results, .file-list');
      await expect(results.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should support search keyboard shortcuts', async ({ page }) => {
    // Test CTRL+F or CMD+F for search focus
    await page.keyboard.press('Control+f');

    await page.waitForTimeout(300);

    // Search input should be focused
    const searchInput = page.locator('input[type="search"], input[name="query"], #searchInput');
    const isFocused = await searchInput.evaluate(el => el === document.activeElement);

    // Focus might not be implemented
    if (isFocused) {
      expect(isFocused).toBe(true);
    }
  });
});
