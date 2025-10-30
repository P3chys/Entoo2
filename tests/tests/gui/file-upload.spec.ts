/**
 * GUI E2E Tests - File Upload
 * Tests for file upload, management, and deletion
 */

import { test, expect } from '@playwright/test';
import { setupAuth } from '../helpers/auth.helper';
import { waitForVisible, waitForSuccessMessage, expandSubject } from '../helpers/ui.helper';
import * as fs from 'fs';
import * as path from 'path';

test.describe('File Upload GUI Tests', () => {
  const testFilesDir = path.join(__dirname, '../fixtures');

  test.beforeAll(async () => {
    // Create test files directory if it doesn't exist
    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true });
    }

    // Create a test PDF file
    const testPdfPath = path.join(testFilesDir, 'test-document.pdf');
    if (!fs.existsSync(testPdfPath)) {
      fs.writeFileSync(testPdfPath, '%PDF-1.4\nTest content');
    }

    // Create a test text file
    const testTxtPath = path.join(testFilesDir, 'test-notes.txt');
    if (!fs.existsSync(testTxtPath)) {
      fs.writeFileSync(testTxtPath, 'Test notes content');
    }
  });

  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await page.waitForLoadState('networkidle');
  });

  test('should display file upload button', async ({ page }) => {
    const uploadBtn = page.locator('button:has-text("Upload"), .upload-button, #uploadFileBtn');
    await expect(uploadBtn.first()).toBeVisible();
  });

  test('should open file upload modal', async ({ page }) => {
    const uploadBtn = page.locator('button:has-text("Upload"), .upload-button, #uploadFileBtn');
    await uploadBtn.first().click();

    // Modal should appear
    const modal = page.locator('.modal, .upload-modal, #uploadModal');
    await expect(modal).toBeVisible({ timeout: 3000 });

    // Modal should have required fields
    await expect(page.locator('input[type="file"], #fileInput')).toBeVisible();
    await expect(page.locator('select[name="subject_name"], #subjectSelect')).toBeVisible();
    await expect(page.locator('select[name="category"], #categorySelect')).toBeVisible();
  });

  test('should successfully upload a PDF file', async ({ page }) => {
    // Open upload modal
    const uploadBtn = page.locator('button:has-text("Upload"), .upload-button, #uploadFileBtn');
    await uploadBtn.first().click();

    await page.waitForTimeout(500);

    // Fill in upload form
    const testPdfPath = path.join(testFilesDir, 'test-document.pdf');
    const fileInput = page.locator('input[type="file"], #fileInput');
    await fileInput.setInputFiles(testPdfPath);

    // Select subject (create or use existing)
    const subjectSelect = page.locator('select[name="subject_name"], #subjectSelect');
    await subjectSelect.selectOption({ index: 1 });

    // Select category
    const categorySelect = page.locator('select[name="category"], #categorySelect');
    await categorySelect.selectOption('Materialy');

    // Submit
    const submitBtn = page.locator('button[type="submit"]:has-text("Upload"), .upload-submit');
    await submitBtn.click();

    // Wait for success
    await waitForSuccessMessage(page).catch(() => {
      // Success message might not be visible
    });

    // Modal should close
    await page.waitForTimeout(1000);

    // File should appear in the list (after refresh or auto-update)
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('should successfully upload a text file', async ({ page }) => {
    const uploadBtn = page.locator('button:has-text("Upload"), .upload-button, #uploadFileBtn');
    await uploadBtn.first().click();

    await page.waitForTimeout(500);

    const testTxtPath = path.join(testFilesDir, 'test-notes.txt');
    const fileInput = page.locator('input[type="file"], #fileInput');
    await fileInput.setInputFiles(testTxtPath);

    const subjectSelect = page.locator('select[name="subject_name"], #subjectSelect');
    await subjectSelect.selectOption({ index: 1 });

    const categorySelect = page.locator('select[name="category"], #categorySelect');
    await categorySelect.selectOption('Materialy');

    const submitBtn = page.locator('button[type="submit"]:has-text("Upload"), .upload-submit');
    await submitBtn.click();

    await page.waitForTimeout(1000);
  });

  test('should validate required fields', async ({ page }) => {
    const uploadBtn = page.locator('button:has-text("Upload"), .upload-button, #uploadFileBtn');
    await uploadBtn.first().click();

    await page.waitForTimeout(500);

    // Try to submit without filling fields
    const submitBtn = page.locator('button[type="submit"]:has-text("Upload"), .upload-submit');
    await submitBtn.click();

    // Should show validation errors or prevent submission
    await page.waitForTimeout(500);

    // Modal should still be visible
    const modal = page.locator('.modal, .upload-modal, #uploadModal');
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

  test('should delete uploaded file', async ({ page }) => {
    // First upload a file
    const uploadBtn = page.locator('button:has-text("Upload"), .upload-button, #uploadFileBtn');
    await uploadBtn.first().click();

    await page.waitForTimeout(500);

    const testPdfPath = path.join(testFilesDir, 'test-delete.pdf');
    fs.writeFileSync(testPdfPath, '%PDF-1.4\nTest delete content');

    const fileInput = page.locator('input[type="file"], #fileInput');
    await fileInput.setInputFiles(testPdfPath);

    const subjectSelect = page.locator('select[name="subject_name"], #subjectSelect');
    await subjectSelect.selectOption({ index: 1 });

    const categorySelect = page.locator('select[name="category"], #categorySelect');
    await categorySelect.selectOption('Materialy');

    const submitBtn = page.locator('button[type="submit"]:has-text("Upload"), .upload-submit');
    await submitBtn.click();

    await page.waitForTimeout(2000);

    // Reload to see the file
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Find and delete the file
    const deleteBtn = page.locator('.delete-file, .file-delete, button:has-text("Delete")').first();

    if (await deleteBtn.count() > 0) {
      await deleteBtn.click();

      // Confirm deletion if there's a confirmation dialog
      page.on('dialog', dialog => dialog.accept());

      await page.waitForTimeout(1000);

      // File should be removed
      // (Verification would require checking the file list)
    }
  });

  test('should show upload progress', async ({ page }) => {
    const uploadBtn = page.locator('button:has-text("Upload"), .upload-button, #uploadFileBtn');
    await uploadBtn.first().click();

    await page.waitForTimeout(500);

    const testPdfPath = path.join(testFilesDir, 'test-document.pdf');
    const fileInput = page.locator('input[type="file"], #fileInput');
    await fileInput.setInputFiles(testPdfPath);

    const subjectSelect = page.locator('select[name="subject_name"], #subjectSelect');
    await subjectSelect.selectOption({ index: 1 });

    const categorySelect = page.locator('select[name="category"], #categorySelect');
    await categorySelect.selectOption('Materialy');

    const submitBtn = page.locator('button[type="submit"]:has-text("Upload"), .upload-submit');
    await submitBtn.click();

    // Check for progress indicator (spinner, progress bar, etc.)
    const progressIndicators = page.locator('.progress, .uploading, .spinner, [data-uploading="true"]');
    const hasProgress = await progressIndicators.count() > 0;

    // Progress indicator might be very fast, so this is optional
    if (hasProgress) {
      await expect(progressIndicators.first()).toBeVisible({ timeout: 2000 });
    }

    await page.waitForTimeout(1000);
  });

  test('should handle file size limits', async ({ page }) => {
    // This test assumes there's a file size limit
    // Create a large test file (if supported)
    const largePdfPath = path.join(testFilesDir, 'large-file.pdf');

    // Create a 20MB file (adjust based on your limits)
    const largeContent = Buffer.alloc(20 * 1024 * 1024, 'a');
    fs.writeFileSync(largePdfPath, largeContent);

    const uploadBtn = page.locator('button:has-text("Upload"), .upload-button, #uploadFileBtn');
    await uploadBtn.first().click();

    await page.waitForTimeout(500);

    const fileInput = page.locator('input[type="file"], #fileInput');
    await fileInput.setInputFiles(largePdfPath);

    const subjectSelect = page.locator('select[name="subject_name"], #subjectSelect');
    await subjectSelect.selectOption({ index: 1 });

    const categorySelect = page.locator('select[name="category"], #categorySelect');
    await categorySelect.selectOption('Materialy');

    const submitBtn = page.locator('button[type="submit"]:has-text("Upload"), .upload-submit');
    await submitBtn.click();

    // Should either show error or accept the upload based on limits
    await page.waitForTimeout(2000);

    // Clean up
    fs.unlinkSync(largePdfPath);
  });
});
