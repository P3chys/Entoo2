/**
 * GUI E2E Tests - Enhanced File Cards
 * Tests for enhanced file card design with color-coded badges and improved UI
 */

import { test, expect } from '@playwright/test';
import { setupAuth } from '../helpers/auth.helper';
import { waitForVisible } from '../helpers/ui.helper';

test.describe('Enhanced File Cards GUI Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await page.waitForLoadState('networkidle');
  });

  test('should display enhanced file cards with proper styling', async ({ page }) => {
    // Wait for subjects to load
    await waitForVisible(page, '.subject-row');

    // Get first subject name
    const firstSubject = page.locator('.subject-row').first();
    const subjectNameElement = firstSubject.locator('.subject-name, .name');
    const subjectName = await subjectNameElement.textContent();

    if (!subjectName) {
      console.log('⚠ No subjects found, skipping test');
      return;
    }

    // Expand subject by clicking expand icon
    await page.getByText('▶').first().click();
    await page.waitForTimeout(1000);

    // Click on a category tab (not Profile)
    const categoryTab = page.locator('.tab-btn').nth(1);
    await categoryTab.click();
    await page.waitForTimeout(500);

    // Find enhanced file items
    const fileItems = page.locator('.file-item.enhanced');
    const count = await fileItems.count();

    if (count > 0) {
      // Verify first file has enhanced class
      const firstFile = fileItems.first();
      await expect(firstFile).toBeVisible();
      await expect(firstFile).toHaveClass(/enhanced/);

      console.log(`✓ Found ${count} enhanced file card(s)`);
    } else {
      console.log('⚠ No files in this category, skipping enhanced card test');
    }
  });

  test('should display file type badges with correct styling', async ({ page }) => {
    await waitForVisible(page, '.subject-row');

    // Expand first subject
    await page.getByText('▶').first().click();
    await page.waitForTimeout(1000);

    // Click on a category tab
    const categoryTab = page.locator('.tab-btn').nth(1);
    await categoryTab.click();
    await page.waitForTimeout(500);

    // Find file type badges
    const badges = page.locator('.file-type-badge');
    const badgeCount = await badges.count();

    if (badgeCount > 0) {
      const firstBadge = badges.first();
      await expect(firstBadge).toBeVisible();

      // Verify badge has proper aria-label
      const ariaLabel = await firstBadge.getAttribute('aria-label');
      expect(ariaLabel).toContain('file');

      // Verify badge has role attribute
      const role = await firstBadge.getAttribute('role');
      expect(role).toBe('status');

      console.log(`✓ Found ${badgeCount} file type badge(s) with accessibility attributes`);
    } else {
      console.log('⚠ No files to test badges');
    }
  });

  test('should apply correct badge color for different file types', async ({ page }) => {
    await waitForVisible(page, '.subject-row');

    await page.getByText('▶').first().click();
    await page.waitForTimeout(1000);

    const categoryTab = page.locator('.tab-btn').nth(1);
    await categoryTab.click();
    await page.waitForTimeout(500);

    const badges = page.locator('.file-type-badge');
    const badgeCount = await badges.count();

    if (badgeCount > 0) {
      // Check that badges have type-specific classes (pdf, docx, ppt, etc.)
      const firstBadge = badges.first();
      const classList = await firstBadge.getAttribute('class');

      // Badge should have a type class in addition to base class
      const hasTypeClass = classList &&
        (classList.includes('pdf') ||
         classList.includes('docx') ||
         classList.includes('doc') ||
         classList.includes('ppt') ||
         classList.includes('pptx') ||
         classList.includes('txt'));

      expect(hasTypeClass).toBeTruthy();
      console.log(`✓ Badge has type-specific class: ${classList}`);
    } else {
      console.log('⚠ No badges to test colors');
    }
  });

  test('should display enhanced file info layout', async ({ page }) => {
    await waitForVisible(page, '.subject-row');

    await page.getByText('▶').first().click();
    await page.waitForTimeout(1000);

    const categoryTab = page.locator('.tab-btn').nth(1);
    await categoryTab.click();
    await page.waitForTimeout(500);

    const fileItems = page.locator('.file-item.enhanced');
    const count = await fileItems.count();

    if (count > 0) {
      const firstFile = fileItems.first();

      // Verify file info container exists
      const fileInfo = firstFile.locator('.file-item-info');
      await expect(fileInfo).toBeVisible();

      // Verify file icon exists
      const fileIcon = firstFile.locator('.file-item-icon');
      await expect(fileIcon).toBeVisible();

      // Verify file details exists
      const fileDetails = firstFile.locator('.file-item-details');
      await expect(fileDetails).toBeVisible();

      // Verify file actions exists
      const fileActions = firstFile.locator('.file-item-actions');
      await expect(fileActions).toBeVisible();

      console.log('✓ Enhanced file layout structure verified');
    } else {
      console.log('⚠ No files to test layout');
    }
  });

  test('should show file metadata with separators', async ({ page }) => {
    await waitForVisible(page, '.subject-row');

    await page.getByText('▶').first().click();
    await page.waitForTimeout(1000);

    const categoryTab = page.locator('.tab-btn').nth(1);
    await categoryTab.click();
    await page.waitForTimeout(500);

    const fileItems = page.locator('.file-item.enhanced');
    const count = await fileItems.count();

    if (count > 0) {
      const firstFile = fileItems.first();
      const fileMeta = firstFile.locator('.file-item-meta');

      await expect(fileMeta).toBeVisible();

      // Verify separators exist
      const separators = fileMeta.locator('.meta-separator');
      const separatorCount = await separators.count();

      expect(separatorCount).toBeGreaterThanOrEqual(1);
      console.log(`✓ Found ${separatorCount} metadata separator(s)`);
    } else {
      console.log('⚠ No files to test metadata');
    }
  });

  test('should display download button with proper styling', async ({ page }) => {
    await waitForVisible(page, '.subject-row');

    await page.getByText('▶').first().click();
    await page.waitForTimeout(1000);

    const categoryTab = page.locator('.tab-btn').nth(1);
    await categoryTab.click();
    await page.waitForTimeout(500);

    const fileItems = page.locator('.file-item.enhanced');
    const count = await fileItems.count();

    if (count > 0) {
      const firstFile = fileItems.first();
      const downloadBtn = firstFile.locator('.download-btn');

      await expect(downloadBtn).toBeVisible();
      await expect(downloadBtn).toHaveClass(/btn-primary/);
      await expect(downloadBtn).toHaveClass(/btn-small/);

      // Verify button text
      const buttonText = await downloadBtn.textContent();
      expect(buttonText).toContain('Download');

      console.log('✓ Download button styling verified');
    } else {
      console.log('⚠ No files to test download button');
    }
  });

  test('should have accessible focus states on buttons', async ({ page }) => {
    await waitForVisible(page, '.subject-row');

    await page.getByText('▶').first().click();
    await page.waitForTimeout(1000);

    const categoryTab = page.locator('.tab-btn').nth(1);
    await categoryTab.click();
    await page.waitForTimeout(500);

    const fileItems = page.locator('.file-item.enhanced');
    const count = await fileItems.count();

    if (count > 0) {
      const firstFile = fileItems.first();
      const downloadBtn = firstFile.locator('.download-btn');

      // Focus the button using keyboard
      await downloadBtn.focus();

      // Verify button is focused
      const isFocused = await downloadBtn.evaluate((el) => el === document.activeElement);
      expect(isFocused).toBeTruthy();

      console.log('✓ Focus state accessible via keyboard');
    } else {
      console.log('⚠ No files to test focus states');
    }
  });

  test('should display owner link with enhanced styling', async ({ page }) => {
    await waitForVisible(page, '.subject-row');

    await page.getByText('▶').first().click();
    await page.waitForTimeout(1000);

    const categoryTab = page.locator('.tab-btn').nth(1);
    await categoryTab.click();
    await page.waitForTimeout(500);

    const fileItems = page.locator('.file-item.enhanced');
    const count = await fileItems.count();

    if (count > 0) {
      const ownerLinks = page.locator('.owner-filter-link');
      const linkCount = await ownerLinks.count();

      if (linkCount > 0) {
        const firstLink = ownerLinks.first();
        await expect(firstLink).toBeVisible();

        // Verify link has owner icon
        const linkText = await firstLink.textContent();
        expect(linkText).toContain('👤');

        console.log('✓ Owner link with enhanced styling found');
      } else {
        console.log('⚠ No owner links in files');
      }
    } else {
      console.log('⚠ No files to test owner links');
    }
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await waitForVisible(page, '.subject-row');

    await page.getByText('▶').first().click();
    await page.waitForTimeout(1000);

    const categoryTab = page.locator('.tab-btn').nth(1);
    await categoryTab.click();
    await page.waitForTimeout(500);

    const fileItems = page.locator('.file-item.enhanced');
    const count = await fileItems.count();

    if (count > 0) {
      const firstFile = fileItems.first();
      await expect(firstFile).toBeVisible();

      // On mobile, file items should still be visible and readable
      const fileDetails = firstFile.locator('.file-item-details');
      await expect(fileDetails).toBeVisible();

      // Buttons should still be clickable
      const downloadBtn = firstFile.locator('.download-btn');
      await expect(downloadBtn).toBeVisible();

      console.log('✓ Enhanced file cards are responsive on mobile');
    } else {
      console.log('⚠ No files to test mobile responsiveness');
    }
  });

  test('should maintain visual hierarchy in file cards', async ({ page }) => {
    await waitForVisible(page, '.subject-row');

    await page.getByText('▶').first().click();
    await page.waitForTimeout(1000);

    const categoryTab = page.locator('.tab-btn').nth(1);
    await categoryTab.click();
    await page.waitForTimeout(500);

    const fileItems = page.locator('.file-item.enhanced');
    const count = await fileItems.count();

    if (count > 0) {
      const firstFile = fileItems.first();

      // Verify visual hierarchy: h4 for filename
      const filename = firstFile.locator('h4');
      await expect(filename).toBeVisible();

      // Badge should be inside h4
      const badgeInH4 = firstFile.locator('h4 .file-type-badge');
      const badgeExists = await badgeInH4.count() > 0;
      expect(badgeExists).toBeTruthy();

      console.log('✓ Visual hierarchy maintained in file cards');
    } else {
      console.log('⚠ No files to test visual hierarchy');
    }
  });
});
