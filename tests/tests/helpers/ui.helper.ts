/**
 * UI Helper for E2E Tests
 * Provides utilities for common UI interactions and assertions
 */

import { Page, expect, Locator } from '@playwright/test';

/**
 * Wait for element to be visible with custom timeout
 * If multiple elements match, waits for the first one
 */
export async function waitForVisible(
  page: Page,
  selector: string,
  timeout: number = 5000
): Promise<Locator> {
  const element = page.locator(selector).first();
  await expect(element).toBeVisible({ timeout });
  return element;
}

/**
 * Wait for element to contain text
 */
export async function waitForText(
  page: Page,
  selector: string,
  text: string,
  timeout: number = 5000
): Promise<void> {
  await expect(page.locator(selector)).toContainText(text, { timeout });
}

/**
 * Click and wait for navigation
 */
export async function clickAndNavigate(
  page: Page,
  selector: string
): Promise<void> {
  await Promise.all([
    page.waitForNavigation(),
    page.click(selector),
  ]);
}

/**
 * Upload file via file input
 */
export async function uploadFile(
  page: Page,
  inputSelector: string,
  filePath: string
): Promise<void> {
  const fileInput = page.locator(inputSelector);
  await fileInput.setInputFiles(filePath);
}

/**
 * Wait for success toast/notification
 */
export async function waitForSuccessMessage(
  page: Page,
  message?: string,
  timeout: number = 5000
): Promise<void> {
  const toastSelector = '.toast, .notification, .alert-success, .success-message';
  await waitForVisible(page, toastSelector, timeout);

  if (message) {
    await waitForText(page, toastSelector, message, timeout);
  }
}

/**
 * Wait for error toast/notification
 */
export async function waitForErrorMessage(
  page: Page,
  message?: string,
  timeout: number = 5000
): Promise<void> {
  const toastSelector = '.toast.error, .notification.error, .alert-error, .error-message';
  await waitForVisible(page, toastSelector, timeout);

  if (message) {
    await waitForText(page, toastSelector, message, timeout);
  }
}

/**
 * Wait for loading spinner to disappear
 */
export async function waitForLoading(page: Page, timeout: number = 10000): Promise<void> {
  // Wait for any loading indicators to disappear
  const loadingSelectors = [
    '.loading',
    '.spinner',
    '.skeleton',
    '[data-loading="true"]',
  ];

  for (const selector of loadingSelectors) {
    const elements = page.locator(selector);
    const count = await elements.count();

    if (count > 0) {
      await expect(elements.first()).toBeHidden({ timeout });
    }
  }
}

/**
 * Expand subject in file tree
 */
export async function expandSubject(
  page: Page,
  subjectName: string
): Promise<void> {
  // Find the subject row
  const subjectRow = page.locator(`.subject-row:has-text("${subjectName}")`);

  // Check if already expanded
  const isExpanded = await subjectRow.locator('.expanded').count() > 0;

  if (!isExpanded) {
    // Click to expand
    await subjectRow.click();

    // Wait for files to load
    await page.waitForTimeout(500);
  }
}

/**
 * Get favorite star element for a subject
 */
export function getFavoriteStar(page: Page, subjectName: string): Locator {
  return page.locator(`.subject-row:has-text("${subjectName}") .favorite-star`);
}

/**
 * Check if subject is marked as favorite
 */
export async function isSubjectFavorite(
  page: Page,
  subjectName: string
): Promise<boolean> {
  const star = getFavoriteStar(page, subjectName);
  const text = await star.textContent();
  return text?.includes('★') || false;
}

/**
 * Toggle favorite for a subject
 */
export async function toggleFavorite(
  page: Page,
  subjectName: string
): Promise<void> {
  const star = getFavoriteStar(page, subjectName);
  await star.click();

  // Wait for animation
  await page.waitForTimeout(300);
}

/**
 * Perform search
 */
export async function search(
  page: Page,
  query: string
): Promise<void> {
  const searchInput = page.locator('input[type="search"], input[name="query"]');
  await searchInput.fill(query);
  await searchInput.press('Enter');

  // Wait for results
  await page.waitForTimeout(1000);
}

/**
 * Open subject profile modal
 */
export async function openSubjectProfile(
  page: Page,
  subjectName: string
): Promise<void> {
  const infoButton = page.locator(
    `.subject-row:has-text("${subjectName}") .subject-info-btn, ` +
    `.subject-row:has-text("${subjectName}") .info-button`
  );

  await infoButton.click();

  // Wait for modal to appear
  await waitForVisible(page, '.modal, .subject-profile-modal');
}

/**
 * Close modal
 */
export async function closeModal(page: Page): Promise<void> {
  // Try close button first
  const closeBtn = page.locator('.modal .close, .modal-close, [data-dismiss="modal"]');
  const count = await closeBtn.count();

  if (count > 0) {
    await closeBtn.first().click();
  } else {
    // Try ESC key
    await page.keyboard.press('Escape');
  }

  // Wait for modal to disappear
  await page.waitForTimeout(300);
}

/**
 * Get file count for a subject
 * @param page - Playwright page object
 * @param subjectNameOrElement - Subject name (string) or Locator element
 */
export async function getFileCount(
  page: Page,
  subjectNameOrElement: string | import('@playwright/test').Locator
): Promise<number> {
  const subjectRow = typeof subjectNameOrElement === 'string'
    ? page.locator(`.subject-row:has-text("${subjectNameOrElement}")`).first()
    : subjectNameOrElement;

  const countText = await subjectRow.locator('.file-count, .count').first().textContent();

  if (!countText) return 0;

  const match = countText.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

/**
 * Wait for network to be idle
 */
export async function waitForNetworkIdle(page: Page, timeout: number = 5000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Take screenshot with timestamp
 */
export async function takeScreenshot(
  page: Page,
  name: string
): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({
    path: `tests/test-results/screenshots/${name}-${timestamp}.png`,
    fullPage: true,
  });
}
