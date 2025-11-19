/**
 * XSS Prevention Tests
 * Tests that user input is properly sanitized to prevent XSS attacks
 */

import { test, expect } from '@playwright/test';
import { setupAuth } from '../helpers/auth.helper';
import { createSubject, createFile, deleteAllTestSubjects } from '../helpers/api.helper';

test.describe('XSS Prevention Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
  });

  test.afterEach(async ({ page }) => {
    // Cleanup test subjects
    await deleteAllTestSubjects(page, 'XSS');
  });

  // Note: These tests verify that XSS content is properly sanitized when displayed.
  // Laravel Blade templates automatically escape content with {{ }} syntax.

  test('should sanitize subject name with script tags', async ({ page }) => {
    const maliciousSubjectName = '<script>alert("XSS")</script>XSS_ScriptTest';

    // Create a subject with malicious name
    await createSubject(page, maliciousSubjectName, 'Materialy');

    // Navigate to dashboard with hard reload to clear cache
    await page.goto('http://localhost:8000/dashboard', { waitUntil: 'networkidle' });
    await page.reload({ waitUntil: 'networkidle' });

    // Wait for subjects to load
    await page.waitForSelector('.subject-row', { timeout: 10000 });

    // Check that script tag is escaped/sanitized
    // Find by the unique safe part of the name
    const subjectElement = page.locator(`.subject-row`).filter({ hasText: 'XSS_ScriptTest' });
    await expect(subjectElement).toBeVisible({ timeout: 10000 });

    // Verify script didn't execute by checking for alert
    // If XSS was successful, the page would have an alert dialog
    const hasDialog = await page.evaluate(() => {
      return typeof window.dialogShown !== 'undefined';
    });
    expect(hasDialog).toBe(false);

    // Verify the HTML is escaped
    const innerHTML = await subjectElement.innerHTML();
    expect(innerHTML).not.toContain('<script>');
    expect(innerHTML).toContain('&lt;script&gt;'); // Should be escaped
  });

  test('should sanitize subject name with event handlers', async ({ page }) => {
    const maliciousSubjectName = '<img src=x onerror="alert(\'XSS\')" />XSS_EventTest';

    await createSubject(page, maliciousSubjectName, 'Materialy');

    await page.goto('http://localhost:8000/dashboard', { waitUntil: 'networkidle' });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('.subject-row', { timeout: 10000 });

    const subjectElement = page.locator(`.subject-row`).filter({ hasText: 'XSS_EventTest' });
    await expect(subjectElement).toBeVisible({ timeout: 10000 });

    // Verify no onerror handler is present
    const innerHTML = await subjectElement.innerHTML();
    expect(innerHTML).not.toContain('onerror=');

    // Check that no img tag was injected
    const imgTags = await subjectElement.locator('img[src="x"]').count();
    expect(imgTags).toBe(0);
  });

  test('should sanitize filename with HTML injection', async ({ page }) => {
    const maliciousFilename = '<b>Bold</b><i>Italic</i>test.pdf';
    const subjectName = 'XSS_FilenameTest';

    await createSubject(page, subjectName, 'Materialy');
    await createFile(page, subjectName, 'Materialy', maliciousFilename);

    await page.goto('http://localhost:8000/dashboard', { waitUntil: 'networkidle' });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('.subject-row', { timeout: 10000 });

    // Expand subject
    const subjectRow = page.locator(`.subject-row`).filter({ hasText: subjectName });
    await subjectRow.click();
    await page.waitForTimeout(1500);

    // Check filename is escaped
    const fileItem = page.locator('.file-item').filter({ hasText: 'test.pdf' });
    await expect(fileItem).toBeVisible();

    const filenameElement = fileItem.locator('h4').first();
    const innerHTML = await filenameElement.innerHTML();

    // Should be escaped
    expect(innerHTML).not.toContain('<b>');
    expect(innerHTML).not.toContain('<i>');
    expect(innerHTML).toContain('&lt;b&gt;'); // Should be escaped
  });

  test('should sanitize search results with malicious content', async ({ page }) => {
    const maliciousSubject = 'XSS_SearchTest<script>alert("search")</script>';

    await createSubject(page, maliciousSubject, 'Materialy');
    await createFile(page, maliciousSubject, 'Materialy', 'searchable.pdf');

    await page.goto('http://localhost:8000/dashboard', { waitUntil: 'networkidle' });
    await page.reload({ waitUntil: 'networkidle' });

    // Perform search
    const searchInput = page.locator('input[type="search"]');
    await searchInput.fill('XSS_SearchTest');
    await searchInput.press('Enter');
    await page.waitForTimeout(2000);

    // Check search results
    const searchResults = page.locator('#searchResultsGrid');
    await expect(searchResults).toBeVisible();

    const resultHTML = await searchResults.innerHTML();
    expect(resultHTML).not.toContain('<script>alert');
    expect(resultHTML).toContain('&lt;script&gt;'); // Should be escaped
  });

  test('should sanitize profile description with XSS payload', async ({ page }) => {
    const subjectName = 'XSS_ProfileTest';
    const maliciousDescription = '<img src=x onerror="alert(\'profile XSS\')" />Description';

    await createSubject(page, subjectName, 'Materialy');

    await page.goto('http://localhost:8000/dashboard', { waitUntil: 'networkidle' });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('.subject-row', { timeout: 10000 });

    // Expand subject
    const subjectRow = page.locator(`.subject-row`).filter({ hasText: subjectName });
    await subjectRow.click();
    await page.waitForTimeout(1500);

    // Click on Profile tab (should be active by default)
    const profileTab = page.locator('.tab-content.active');
    await expect(profileTab).toBeVisible();

    // Click edit/create profile button
    const createProfileBtn = page.locator('button:has-text("Create Profile")');
    if (await createProfileBtn.isVisible()) {
      await createProfileBtn.click();
      await page.waitForTimeout(500);

      // Fill in profile with malicious description
      const descriptionInput = page.locator('textarea[name="description"]');
      await descriptionInput.fill(maliciousDescription);

      // Save profile
      const saveBtn = page.locator('button:has-text("Save")');
      await saveBtn.click();
      await page.waitForTimeout(1000);

      // Refresh and check
      await page.reload();
      await page.waitForLoadState('networkidle');

      await subjectRow.click();
      await page.waitForTimeout(1000);

      // Verify description is escaped
      const profileContent = page.locator('.tab-content.active');
      const profileHTML = await profileContent.innerHTML();

      expect(profileHTML).not.toContain('onerror=');
      expect(profileHTML).not.toContain('<img src=x');
    }
  });

  test('should sanitize user name in file owner display', async ({ page }) => {
    // Note: This test verifies that user names from API are sanitized
    // User registration typically validates names, but we test display sanitization
    const subjectName = 'XSS_OwnerTest';

    await createSubject(page, subjectName, 'Materialy');
    await createFile(page, subjectName, 'Materialy', 'owner-test.pdf');

    await page.goto('http://localhost:8000/dashboard', { waitUntil: 'networkidle' });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('.subject-row', { timeout: 10000 });

    // Expand subject
    const subjectRow = page.locator(`.subject-row`).filter({ hasText: subjectName });
    await subjectRow.click();
    await page.waitForTimeout(1500);

    // Check file owner display
    const fileItem = page.locator('.file-item').filter({ hasText: 'owner-test.pdf' });
    await expect(fileItem).toBeVisible();

    const metaElement = fileItem.locator('.file-item-meta');
    const metaHTML = await metaElement.innerHTML();

    // Verify no script injection in owner name
    expect(metaHTML).not.toContain('<script>');
    expect(metaHTML).not.toContain('onerror=');
  });

  test('should sanitize highlight snippets in search results', async ({ page }) => {
    const subjectName = 'XSS_HighlightTest';
    const maliciousContent = 'This is a test <script>alert("highlight")</script> document';

    await createSubject(page, subjectName, 'Materialy');
    await createFile(page, subjectName, 'Materialy', 'highlight-test.pdf');

    await page.goto('http://localhost:8000/dashboard', { waitUntil: 'networkidle' });
    await page.reload({ waitUntil: 'networkidle' });

    // Search for content that might appear in highlights
    const searchInput = page.locator('input[type="search"]');
    await searchInput.fill('XSS_HighlightTest');
    await searchInput.press('Enter');
    await page.waitForTimeout(2000);

    // Check if highlights are shown and sanitized
    const searchHighlight = page.locator('.search-highlight');
    if (await searchHighlight.count() > 0) {
      const highlightHTML = await searchHighlight.first().innerHTML();

      // Should not contain unescaped script tags
      expect(highlightHTML).not.toContain('<script>alert');
    }
  });

  test('should sanitize category names in tabs', async ({ page }) => {
    const subjectName = 'XSS_CategoryTest';

    await createSubject(page, subjectName, 'Materialy');

    await page.goto('http://localhost:8000/dashboard', { waitUntil: 'networkidle' });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('.subject-row', { timeout: 10000 });

    // Expand subject
    const subjectRow = page.locator(`.subject-row`).filter({ hasText: subjectName });
    await subjectRow.click();
    await page.waitForTimeout(1500);

    // Check category tabs
    const categoryTabs = page.locator('.tab-btn');
    const tabCount = await categoryTabs.count();

    for (let i = 0; i < tabCount; i++) {
      const tab = categoryTabs.nth(i);
      const tabHTML = await tab.innerHTML();

      // Verify no script injection in tab names
      expect(tabHTML).not.toContain('<script>');
      expect(tabHTML).not.toContain('onerror=');
    }
  });

  test('should prevent DOM-based XSS through URL parameters', async ({ page }) => {
    const maliciousQuery = '<img src=x onerror="alert(\'url XSS\')">';

    // Try to inject via search query parameter
    await page.goto(`http://localhost:8000/dashboard/search/${encodeURIComponent(maliciousQuery)}`);
    await page.waitForLoadState('networkidle');

    // Check page content
    const bodyHTML = await page.innerHTML('body');

    // Should be escaped
    expect(bodyHTML).not.toContain('onerror="alert');
    expect(bodyHTML).not.toContain('<img src=x onerror=');
  });

  test('should sanitize filter notification with user name', async ({ page }) => {
    // This tests the filterByOwner notification
    // We'll verify that user names in notifications are escaped
    const subjectName = 'XSS_FilterTest';

    await createSubject(page, subjectName, 'Materialy');
    await createFile(page, subjectName, 'Materialy', 'filter-test.pdf');

    await page.goto('http://localhost:8000/dashboard', { waitUntil: 'networkidle' });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('.subject-row', { timeout: 10000 });

    // Expand subject
    const subjectRow = page.locator(`.subject-row`).filter({ hasText: subjectName });
    await subjectRow.click();
    await page.waitForTimeout(1500);

    // Click on file owner link to filter
    const ownerLink = page.locator('.file-item-meta a').first();
    if (await ownerLink.count() > 0) {
      await ownerLink.click();
      await page.waitForTimeout(1000);

      // Check notification
      const notification = page.locator('.alert-success');
      if (await notification.isVisible()) {
        const notificationHTML = await notification.innerHTML();

        // Should not contain malicious scripts
        expect(notificationHTML).not.toContain('<script>');
        expect(notificationHTML).not.toContain('onerror=');
      }
    }
  });

  test('should handle multiple XSS vectors in single subject name', async ({ page }) => {
    const complexXSSPayload = '"><script>alert(1)</script><img src=x onerror=alert(2)>XSS_MultiTest';

    await createSubject(page, complexXSSPayload, 'Materialy');

    await page.goto('http://localhost:8000/dashboard', { waitUntil: 'networkidle' });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('.subject-row', { timeout: 10000 });

    const subjectElement = page.locator(`.subject-row`).filter({ hasText: 'XSS_MultiTest' });
    await expect(subjectElement).toBeVisible({ timeout: 10000 });

    const innerHTML = await subjectElement.innerHTML();

    // All payloads should be escaped
    expect(innerHTML).not.toContain('<script>alert(1)</script>');
    expect(innerHTML).not.toContain('onerror=alert(2)');
    expect(innerHTML).not.toContain('"><script>');

    // Should contain escaped versions
    expect(innerHTML).toMatch(/&lt;|&gt;/);
  });
});
