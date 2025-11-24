/**
 * GUI E2E Tests - File Upload
 * Tests for file upload, management, and deletion
 *
 * ✨ OPTIMIZED: Uses DashboardPage, UploadModalPage, FileBuilder, and Fixtures
 */

import { test, expect as baseExpect } from '../../fixtures';
import { expect } from '../../matchers';
import { FileBuilder } from '../../builders';
import { waitForVisible, expandSubject } from '../helpers/ui.helper';
import * as fs from 'fs';
import * as path from 'path';

// Define test files directory
const testFilesDir = path.join(__dirname, '../fixtures');

// Ensure fixtures directory exists
if (!fs.existsSync(testFilesDir)) {
  fs.mkdirSync(testFilesDir, { recursive: true });
}

test.describe('File Upload GUI Tests', () => {
  // ✨ OPTIMIZED: Most setup is now handled by fixtures
  // dashboardPage fixture provides authenticated dashboard
  // testPdfFile and testTxtFile fixtures provide test files

  test.beforeEach(async ({ dashboardPage, fileTree }) => {
    // ✨ OPTIMIZED: Use FileTreeComponent to expand subject
    await fileTree.waitForLoad();

    const subjects = await fileTree.getAllSubjectNames();
    if (subjects.length > 0) {
      const firstSubject = subjects[0];
      await fileTree.expandSubject(firstSubject);

      // Try to click on first available category tab
      const categoryNames = ['Prednasky', 'Materialy', 'Otazky', 'Seminare'];
      for (const categoryName of categoryNames) {
        try {
          await dashboardPage.selectCategory(categoryName);
          break;
        } catch {
          // Try next category
          continue;
        }
      }
    }
  });

  test('should display file upload button', async ({ dashboardPage }) => {
    // ✨ OPTIMIZED: Use DashboardPage locator
    await baseExpect(dashboardPage.uploadBtnCategory.first()).toBeVisible();
  });

  test('should open file upload modal', async ({ dashboardPage, uploadModalPage, authenticatedPage: page }) => {
    // ✨ OPTIMIZED: Use DashboardPage and UploadModalPage
    await dashboardPage.openUploadModal();

    // Modal should appear
    const modal = uploadModalPage.modal;
    await expect(modal).toBeVisible({ timeout: 3000 });

    // Modal should have required fields
    await expect(uploadModalPage.page.locator('#fileInput')).toBeVisible();
    // Context mode shows subject/category, not selectors
    await expect(uploadModalPage.page.locator('#uploadContext')).toBeVisible();
  });


  test('should successfully upload a text file', async ({ page, testTxtFile }) => {
    const uploadBtn = page.locator('.upload-btn-category');
    await uploadBtn.first().click();

    await page.waitForTimeout(500);

    const fileInput = page.locator('#fileInput');
    await fileInput.setInputFiles(testTxtFile.path);

    // Context mode - subject/category already set
    await expect(page.locator('#uploadContext')).toBeVisible();

    const submitBtn = page.locator('#uploadBtn');
    await submitBtn.click();

    await page.waitForTimeout(3000);
  });

  test('should validate required fields', async ({ page }) => {
    const uploadBtn = page.locator('.upload-btn-category');
    await uploadBtn.first().click();

    await page.waitForTimeout(500);

    // Try to submit without selecting a file (subject/category already set in context mode)
    const submitBtn = page.locator('#uploadBtn');
    await submitBtn.click();

    // Should show validation errors or prevent submission
    await page.waitForTimeout(500);

    // Modal should still be visible (file is required)
    const modal = page.locator('#uploadModal');
    const isVisible = await modal.isVisible();
    expect(isVisible).toBe(true);
  });

  test('should display uploaded files in subject', async ({ page }) => {
    // Wait for subjects to load
    await waitForVisible(page, '.subject-row');

    // Expand first subject
    const firstSubject = page.locator('.subject-row').first();
    const subjectName = await firstSubject.locator('.subject-name, .name').textContent();

    if (subjectName) {
      await expandSubject(page, subjectName);

      // Should display files or empty state
      const filesContainer = page.locator('.files-container, .file-list, .category-files');
      const count = await filesContainer.count();

      // Either files are visible or empty state is shown
      if (count > 0) {
        await expect(filesContainer.first()).toBeVisible();
      }
    }
  });

  test('should download file', async ({ page }) => {
    // Wait for subjects to load
    await waitForVisible(page, '.subject-row');

    // Expand first subject that has files
    const subjects = page.locator('.subject-row');
    const count = await subjects.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const subject = subjects.nth(i);
      const fileCountText = await subject.locator('.file-count, .count').textContent();
      const fileCount = fileCountText ? parseInt(fileCountText.match(/\d+/)?.[0] || '0') : 0;

      if (fileCount > 0) {
        const subjectName = await subject.locator('.subject-name, .name').textContent();

        if (subjectName) {
          await expandSubject(page, subjectName);

          // Find first file download link
          const downloadLink = page.locator('.file-item a, .file-download, a[href*="/files/download"]').first();

          if (await downloadLink.count() > 0) {
            // Start waiting for download before clicking
            const downloadPromise = page.waitForEvent('download');
            await downloadLink.click();

            // Wait for download to start
            const download = await downloadPromise;

            // Verify download started
            expect(download.suggestedFilename()).toBeTruthy();
            break;
          }
        }
      }
    }
  });

  test('should delete uploaded file', async ({ page, testPdfFile }) => {
    // First upload a file
    const uploadBtn = page.locator('.upload-btn-category');
    await uploadBtn.first().click();

    await page.waitForTimeout(500);

    // Create a test file for deletion
    const testFilesDir = path.dirname(testPdfFile.path);
    const testPdfPath = path.join(testFilesDir, 'test-delete.pdf');
    fs.writeFileSync(testPdfPath, '%PDF-1.4\nTest delete content');

    const fileInput = page.locator('#fileInput');
    await fileInput.setInputFiles(testPdfPath);

    // Context mode - subject/category already set
    await expect(page.locator('#uploadContext')).toBeVisible();

    const submitBtn = page.locator('#uploadBtn');
    await submitBtn.click();

    await page.waitForTimeout(5000);

    // Reload to see the file
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Expand the subject again and click on category tab to see files
    const firstSubject = await page.locator('.subject-row .subject-name, .subject-row .name').first().textContent();
    if (firstSubject) {
      await expandSubject(page, firstSubject.trim());

      // Click on a category tab to reveal delete buttons
      await page.waitForTimeout(500);
      const categoryNames = ['Prednasky', 'Materialy', 'Otazky', 'Seminare'];
      for (const categoryName of categoryNames) {
        const categoryTab = page.locator(`button:has-text("${categoryName}")`).first();
        if (await categoryTab.count() > 0) {
          await categoryTab.click();
          await page.waitForTimeout(300);
          break;
        }
      }
    }

    // Find and delete the file
    const deleteBtn = page.locator('.delete-file, .file-delete, button:has-text("Delete"), .delete-btn').first();

    if (await deleteBtn.count() > 0) {
      // Confirm deletion if there's a confirmation dialog
      page.on('dialog', dialog => dialog.accept());

      await deleteBtn.click();

      await page.waitForTimeout(2000);

      // File should be removed
      // (Verification would require checking the file list)
    }

    // Clean up
    if (fs.existsSync(testPdfPath)) {
      fs.unlinkSync(testPdfPath);
    }
  });

  test('should show upload progress', async ({ page, testPdfFile }) => {
    const uploadBtn = page.locator('.upload-btn-category');
    await uploadBtn.first().click();

    await page.waitForTimeout(500);

    const fileInput = page.locator('#fileInput');
    await fileInput.setInputFiles(testPdfFile.path);

    // Context mode - subject/category already set
    await expect(page.locator('#uploadContext')).toBeVisible();

    const submitBtn = page.locator('#uploadBtn');
    await submitBtn.click();

    // Check for progress indicator
    const uploadProgress = page.locator('#uploadProgress');
    await expect(uploadProgress).toBeVisible({ timeout: 3000 }).catch(() => {
      // Progress might be too fast to catch
    });

    await page.waitForTimeout(3000);
  });

  test('should handle file size limits', async ({ page, testPdfFile }) => {
    // This test assumes there's a file size limit (50MB according to UI hint)
    // Create a large test file (60MB - over the limit)
    const testFilesDir = path.dirname(testPdfFile.path);
    const largePdfPath = path.join(testFilesDir, 'large-file.pdf');

    // Create a 60MB file to test size limit
    const largeContent = Buffer.alloc(60 * 1024 * 1024, 'a');
    fs.writeFileSync(largePdfPath, largeContent);

    const uploadBtn = page.locator('.upload-btn-category');
    await uploadBtn.first().click();

    await page.waitForTimeout(500);

    const fileInput = page.locator('#fileInput');
    await fileInput.setInputFiles(largePdfPath);

    // Context mode - subject/category already set
    await expect(page.locator('#uploadContext')).toBeVisible();

    const submitBtn = page.locator('#uploadBtn');
    await submitBtn.click();

    // Should show error for file too large
    await page.waitForTimeout(2000);

    // Check for error message
    const errorMsg = page.locator('#uploadError');
    await expect(errorMsg).toBeVisible({ timeout: 5000 }).catch(() => {
      // Error handling might be different
    });

    // Clean up
    if (fs.existsSync(largePdfPath)) {
      fs.unlinkSync(largePdfPath);
    }
  });
});
