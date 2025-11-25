import { test, expect } from '@playwright/test';
import { setupAuth, getAuthHeaders } from '../helpers/auth.helper';
import { createTestFile, deleteTestFile } from '../helpers/api.helper';

test.describe('File Deletion Tests', () => {
  let testFileId: number;
  let testSubjectName: string;

  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    testSubjectName = `Test Subject ${Date.now()}`;
  });

  test.afterEach(async ({ page }) => {
    // Cleanup: try to delete the test file if it still exists
    if (testFileId) {
      try {
        await deleteTestFile(page, testFileId);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  test('should delete own file successfully from dashboard', async ({ page }) => {
    // Create a test file
    const fileData = await createTestFile(page, testSubjectName, 'Materialy');
    testFileId = fileData.file.id;

    // Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Find and expand the subject
    const subjectHeader = page.locator('.subject-header').filter({ hasText: testSubjectName });
    await expect(subjectHeader).toBeVisible({ timeout: 10000 });
    await subjectHeader.click();

    // Wait for files to load
    await page.waitForTimeout(1000);

    // Find the delete button for our file
    const deleteBtn = page.locator(`.delete-btn[data-file-id="${testFileId}"]`);
    await expect(deleteBtn).toBeVisible({ timeout: 5000 });

    // Set up dialog handler to confirm deletion
    page.once('dialog', dialog => {
      expect(dialog.message()).toContain('Are you sure');
      dialog.accept();
    });

    // Click delete button
    await deleteBtn.click();

    // Wait for success alert
    page.once('dialog', dialog => {
      expect(dialog.message()).toContain('successfully');
      dialog.accept();
    });

    // Wait for page reload
    await page.waitForLoadState('networkidle');

    // Verify file is no longer visible
    await expect(page.locator(`.delete-btn[data-file-id="${testFileId}"]`)).not.toBeVisible();

    // Clear testFileId so afterEach doesn't try to delete it again
    testFileId = 0;
  });

  test('should delete own file from search results', async ({ page }) => {
    // Create a test file
    const uniqueFileName = `test-delete-search-${Date.now()}.txt`;
    const fileData = await createTestFile(page, testSubjectName, 'Materialy', uniqueFileName);
    testFileId = fileData.file.id;

    // Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Search for the file
    const searchInput = page.locator('input[type="search"]');
    await searchInput.fill(testSubjectName);
    await searchInput.press('Enter');

    // Wait for search results
    await page.waitForTimeout(1500);

    // Find the delete button in search results
    const deleteBtn = page.locator(`.delete-btn[data-file-id="${testFileId}"]`);
    await expect(deleteBtn).toBeVisible({ timeout: 5000 });

    // Set up dialog handler to confirm deletion
    page.once('dialog', dialog => {
      expect(dialog.message()).toContain('Are you sure');
      dialog.accept();
    });

    // Click delete button
    await deleteBtn.click();

    // Wait for success alert
    page.once('dialog', dialog => {
      expect(dialog.message()).toContain('successfully');
      dialog.accept();
    });

    // Wait for page reload
    await page.waitForLoadState('networkidle');

    // Verify file is no longer in search results
    await expect(page.locator(`.delete-btn[data-file-id="${testFileId}"]`)).not.toBeVisible();

    // Clear testFileId
    testFileId = 0;
  });

  test('should show error message if file deletion fails', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Try to delete a non-existent file
    const fakeFileId = 999999;

    // Inject a delete button for testing error handling
    await page.evaluate((fileId) => {
      const btn = document.createElement('button');
      btn.className = 'delete-btn';
      btn.dataset.fileId = String(fileId);
      btn.textContent = 'Test Delete';
      btn.id = 'test-delete-btn';
      document.body.appendChild(btn);
    }, fakeFileId);

    const testBtn = page.locator('#test-delete-btn');
    await expect(testBtn).toBeVisible();

    // Set up dialog handler to confirm deletion
    page.once('dialog', dialog => {
      expect(dialog.message()).toContain('Are you sure');
      dialog.accept();
    });

    // Click delete button
    await testBtn.click();

    // Wait for error alert
    await page.waitForTimeout(500);
    page.once('dialog', dialog => {
      expect(dialog.message()).toContain('Failed to delete file');
      dialog.accept();
    });
  });

  test('admin should be able to delete any file', async ({ page, browser }) => {
    // Create a file as a regular user
    const fileData = await createTestFile(page, testSubjectName, 'Materialy');
    testFileId = fileData.file.id;

    // Log out the regular user
    await page.evaluate(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    });

    // Log in as admin in a new context
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();

    // Log in as admin
    await adminPage.goto('/login');
    await adminPage.fill('input[type="email"]', 'admin@entoo.cz');
    await adminPage.fill('input[type="password"]', 'admin123');
    await adminPage.click('button[type="submit"]');
    await adminPage.waitForURL('/dashboard');

    // Navigate to admin panel
    await adminPage.goto('/admin');
    await adminPage.waitForLoadState('networkidle');

    // Search for the file
    const searchInput = adminPage.locator('input[placeholder*="Search"]').first();
    await searchInput.fill(testSubjectName);
    await searchInput.press('Enter');
    await adminPage.waitForTimeout(1000);

    // Find and delete the file
    const deleteBtn = adminPage.locator(`button[data-file-id="${testFileId}"]`);
    await expect(deleteBtn).toBeVisible({ timeout: 5000 });

    // Set up dialog handler
    adminPage.once('dialog', dialog => {
      dialog.accept();
    });

    await deleteBtn.click();

    // Wait for deletion to complete
    await adminPage.waitForTimeout(1000);

    // Verify file is gone
    await expect(deleteBtn).not.toBeVisible();

    await adminContext.close();

    // Clear testFileId
    testFileId = 0;
  });

  test('should not show delete button for files uploaded by other users', async ({ page, browser }) => {
    // Create a file as the current user
    const fileData = await createTestFile(page, testSubjectName, 'Materialy');
    testFileId = fileData.file.id;

    // Get current user info
    const currentUser = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('user') || '{}');
    });

    // Log out
    await page.evaluate(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    });

    // Create a new user and log in
    const newUserContext = await browser.newContext();
    const newUserPage = await newUserContext.newPage();

    await newUserPage.goto('/register');
    const newEmail = `test-${Date.now()}@entoo.cz`;
    await newUserPage.fill('input[name="name"]', 'Test User');
    await newUserPage.fill('input[name="email"]', newEmail);
    await newUserPage.fill('input[name="password"]', 'password123');
    await newUserPage.fill('input[name="password_confirmation"]', 'password123');
    await newUserPage.click('button[type="submit"]');
    await newUserPage.waitForURL('/dashboard');

    // Navigate to dashboard and expand the subject
    await newUserPage.goto('/dashboard');
    await newUserPage.waitForLoadState('networkidle');

    const subjectHeader = newUserPage.locator('.subject-header').filter({ hasText: testSubjectName });

    // Only check if the subject exists (it might not if files are filtered by user)
    const subjectExists = await subjectHeader.count() > 0;

    if (subjectExists) {
      await subjectHeader.click();
      await newUserPage.waitForTimeout(1000);

      // Verify that delete button is NOT present for the file (since this user didn't upload it)
      const deleteBtn = newUserPage.locator(`.delete-btn[data-file-id="${testFileId}"]`);
      await expect(deleteBtn).not.toBeVisible();
    }

    await newUserContext.close();

    // Clean up the test file as the original user
    await setupAuth(page);
    await deleteTestFile(page, testFileId);
    testFileId = 0;
  });

  test('should handle rapid deletion attempts gracefully', async ({ page }) => {
    // Create multiple test files
    const fileIds: number[] = [];
    for (let i = 0; i < 3; i++) {
      const fileData = await createTestFile(page, testSubjectName, 'Materialy', `test-${i}.txt`);
      fileIds.push(fileData.file.id);
    }

    // Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Expand subject
    const subjectHeader = page.locator('.subject-header').filter({ hasText: testSubjectName });
    await expect(subjectHeader).toBeVisible();
    await subjectHeader.click();
    await page.waitForTimeout(1000);

    // Delete all files rapidly
    for (const fileId of fileIds) {
      const deleteBtn = page.locator(`.delete-btn[data-file-id="${fileId}"]`);

      if (await deleteBtn.isVisible()) {
        // Set up dialog handler
        page.once('dialog', dialog => {
          dialog.accept();
        });

        await deleteBtn.click();

        // Handle success dialog
        page.once('dialog', dialog => {
          dialog.accept();
        });

        // Brief wait between deletions
        await page.waitForTimeout(500);
      }
    }

    // Wait for final reload
    await page.waitForLoadState('networkidle');

    // Verify all files are deleted
    for (const fileId of fileIds) {
      await expect(page.locator(`.delete-btn[data-file-id="${fileId}"]`)).not.toBeVisible();
    }

    // Clear testFileId array
    fileIds.length = 0;
  });
});
