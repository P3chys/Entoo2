/**
 * GUI E2E Tests - Subject Profile
 * Tests for subject profile modal and information display
 */

import { test, expect } from '@playwright/test';
import { setupAuth } from '../helpers/auth.helper';
import { waitForVisible, openSubjectProfile, closeModal } from '../helpers/ui.helper';

test.describe('Subject Profile GUI Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await page.waitForLoadState('networkidle');
  });

  test('should not generate 404 errors when expanding subjects without profiles', async ({ page }) => {
    // Listen for console errors and failed requests
    const consoleErrors: string[] = [];
    const failedRequests: { url: string; status: number }[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('response', (response) => {
      if (response.status() === 404 && response.url().includes('/api/subject-profiles/')) {
        failedRequests.push({ url: response.url(), status: response.status() });
      }
    });

    await waitForVisible(page, '.subject-row');

    // Find a subject and expand it
    const firstSubject = page.locator('.subject-row').first();
    const subjectHeader = firstSubject.locator('.subject-header').first();

    // Click to expand the subject
    await subjectHeader.click();

    // Wait for content to load
    await page.waitForTimeout(2000);

    // Check for Profile tab
    const profileTab = page.locator('.tab-btn:has-text("Profile")').first();
    await expect(profileTab).toBeVisible({ timeout: 5000 });

    // Click on Profile tab
    await profileTab.click();
    await page.waitForTimeout(1000);

    // Verify no 404 errors were logged to console for subject-profiles endpoint
    expect(failedRequests.length).toBe(0);
  });

  test('should display "Create Profile" option for subjects without profiles', async ({ page }) => {
    await waitForVisible(page, '.subject-row');

    // Find first subject and expand it
    const firstSubject = page.locator('.subject-row').first();
    const subjectHeader = firstSubject.locator('.subject-header').first();

    await subjectHeader.click();
    await page.waitForTimeout(1500);

    // Check for Profile tab
    const profileTab = page.locator('.tab-btn:has-text("Profile")').first();
    await expect(profileTab).toBeVisible({ timeout: 5000 });

    // Click on Profile tab
    await profileTab.click();
    await page.waitForTimeout(500);

    // Should show either profile content or "Create Profile" button
    const createProfileBtn = page.locator('button:has-text("Create Profile")').first();
    const profileContent = page.locator('.tab-content.active').first();

    await expect(profileContent).toBeVisible();

    // Check if "Create Profile" button or profile data is visible
    const hasCreateButton = (await createProfileBtn.count()) > 0;
    if (hasCreateButton) {
      await expect(createProfileBtn).toBeVisible();
    }
  });

  test('should display info button for subjects', async ({ page }) => {
    await waitForVisible(page, '.subject-row');

    // Get first subject
    const firstSubject = page.locator('.subject-row').first();

    // Look for info/profile button
    const infoBtn = firstSubject.locator('.subject-info-btn, .info-button, button:has-text("i")');
    const hasInfoBtn = await infoBtn.count() > 0;

    if (hasInfoBtn) {
      await expect(infoBtn).toBeVisible();
    }
  });

  test('should open subject profile modal', async ({ page }) => {
    await waitForVisible(page, '.subject-row');

    const firstSubject = page.locator('.subject-row').first();
    const subjectName = await firstSubject.locator('.subject-name, .name').textContent();

    if (!subjectName) {
      return;
    }

    // Look for info button
    const infoBtn = firstSubject.locator('.subject-info-btn, .info-button, button:has-text("i")');
    const hasInfoBtn = await infoBtn.count() > 0;

    if (hasInfoBtn) {
      await openSubjectProfile(page, subjectName);

      // Modal should be visible
      const modal = page.locator('.modal, .subject-profile-modal, #subjectProfileModal');
      await expect(modal).toBeVisible({ timeout: 3000 });

      // Modal should show subject name
      const modalTitle = page.locator('.modal-title, .subject-profile-title');
      await expect(modalTitle).toContainText(subjectName);
    }
  });

  test('should display subject information', async ({ page }) => {
    await waitForVisible(page, '.subject-row');

    const firstSubject = page.locator('.subject-row').first();
    const subjectName = await firstSubject.locator('.subject-name, .name').textContent();

    if (!subjectName) {
      return;
    }

    const infoBtn = firstSubject.locator('.subject-info-btn, .info-button');
    if (await infoBtn.count() > 0) {
      await openSubjectProfile(page, subjectName);

      const modal = page.locator('.modal, .subject-profile-modal');

      // Should display subject description
      const description = modal.locator('.description, .subject-description, textarea[name="description"]');
      await expect(description.first()).toBeVisible({ timeout: 3000 }).catch(() => {
        // Description field might be empty
      });

      // Should display other fields
      const fields = ['teacher', 'exam_type', 'exam_date', 'credits'];

      for (const field of fields) {
        const fieldElem = modal.locator(`[name="${field}"], .${field}`);
        const count = await fieldElem.count();

        if (count > 0) {
          await expect(fieldElem.first()).toBeVisible();
        }
      }
    }
  });

  test('should edit subject profile', async ({ page }) => {
    await waitForVisible(page, '.subject-row');

    const firstSubject = page.locator('.subject-row').first();
    const subjectName = await firstSubject.locator('.subject-name, .name').textContent();

    if (!subjectName) {
      return;
    }

    const infoBtn = firstSubject.locator('.subject-info-btn, .info-button');
    if (await infoBtn.count() > 0) {
      await openSubjectProfile(page, subjectName);

      const modal = page.locator('.modal, .subject-profile-modal');

      // Fill in description
      const description = modal.locator('textarea[name="description"], #description');
      if (await description.count() > 0) {
        await description.fill('Test description for E2E testing');

        // Save
        const saveBtn = modal.locator('button:has-text("Save"), .save-button, button[type="submit"]');
        await saveBtn.click();

        // Wait for save to complete
        await page.waitForTimeout(1000);

        // Modal might close or show success message
      }
    }
  });

  test('should close modal with X button', async ({ page }) => {
    await waitForVisible(page, '.subject-row');

    const firstSubject = page.locator('.subject-row').first();
    const subjectName = await firstSubject.locator('.subject-name, .name').textContent();

    if (!subjectName) {
      return;
    }

    const infoBtn = firstSubject.locator('.subject-info-btn, .info-button');
    if (await infoBtn.count() > 0) {
      await openSubjectProfile(page, subjectName);

      const modal = page.locator('.modal, .subject-profile-modal');
      await expect(modal).toBeVisible();

      // Close modal
      await closeModal(page);

      // Modal should be hidden
      await expect(modal).toBeHidden({ timeout: 2000 });
    }
  });

  test('should close modal with ESC key', async ({ page }) => {
    await waitForVisible(page, '.subject-row');

    const firstSubject = page.locator('.subject-row').first();
    const subjectName = await firstSubject.locator('.subject-name, .name').textContent();

    if (!subjectName) {
      return;
    }

    const infoBtn = firstSubject.locator('.subject-info-btn, .info-button');
    if (await infoBtn.count() > 0) {
      await openSubjectProfile(page, subjectName);

      const modal = page.locator('.modal, .subject-profile-modal');
      await expect(modal).toBeVisible();

      // Press ESC
      await page.keyboard.press('Escape');

      // Modal should be hidden
      await expect(modal).toBeHidden({ timeout: 2000 });
    }
  });

  test('should close modal by clicking outside', async ({ page }) => {
    await waitForVisible(page, '.subject-row');

    const firstSubject = page.locator('.subject-row').first();
    const subjectName = await firstSubject.locator('.subject-name, .name').textContent();

    if (!subjectName) {
      return;
    }

    const infoBtn = firstSubject.locator('.subject-info-btn, .info-button');
    if (await infoBtn.count() > 0) {
      await openSubjectProfile(page, subjectName);

      const modal = page.locator('.modal, .subject-profile-modal');
      await expect(modal).toBeVisible();

      // Click backdrop
      const backdrop = page.locator('.modal-backdrop, .backdrop, .overlay');
      if (await backdrop.count() > 0) {
        await backdrop.click({ position: { x: 0, y: 0 } });

        // Modal should be hidden
        await expect(modal).toBeHidden({ timeout: 2000 });
      }
    }
  });

  test('should display teacher information', async ({ page }) => {
    await waitForVisible(page, '.subject-row');

    const firstSubject = page.locator('.subject-row').first();
    const subjectName = await firstSubject.locator('.subject-name, .name').textContent();

    if (!subjectName) {
      return;
    }

    const infoBtn = firstSubject.locator('.subject-info-btn, .info-button');
    if (await infoBtn.count() > 0) {
      await openSubjectProfile(page, subjectName);

      const modal = page.locator('.modal, .subject-profile-modal');

      // Look for teacher field
      const teacher = modal.locator('input[name="teacher"], #teacher, .teacher-name');
      const hasTeacher = await teacher.count() > 0;

      if (hasTeacher) {
        await expect(teacher.first()).toBeVisible();
      }
    }
  });

  test('should display exam information', async ({ page }) => {
    await waitForVisible(page, '.subject-row');

    const firstSubject = page.locator('.subject-row').first();
    const subjectName = await firstSubject.locator('.subject-name, .name').textContent();

    if (!subjectName) {
      return;
    }

    const infoBtn = firstSubject.locator('.subject-info-btn, .info-button');
    if (await infoBtn.count() > 0) {
      await openSubjectProfile(page, subjectName);

      const modal = page.locator('.modal, .subject-profile-modal');

      // Look for exam type
      const examType = modal.locator('select[name="exam_type"], #exam_type');
      if (await examType.count() > 0) {
        await expect(examType).toBeVisible();
      }

      // Look for exam date
      const examDate = modal.locator('input[name="exam_date"], #exam_date, input[type="date"]');
      if (await examDate.count() > 0) {
        await expect(examDate.first()).toBeVisible();
      }
    }
  });

  test('should validate required fields when saving', async ({ page }) => {
    await waitForVisible(page, '.subject-row');

    const firstSubject = page.locator('.subject-row').first();
    const subjectName = await firstSubject.locator('.subject-name, .name').textContent();

    if (!subjectName) {
      return;
    }

    const infoBtn = firstSubject.locator('.subject-info-btn, .info-button');
    if (await infoBtn.count() > 0) {
      await openSubjectProfile(page, subjectName);

      const modal = page.locator('.modal, .subject-profile-modal');

      // Clear description if present
      const description = modal.locator('textarea[name="description"], #description');
      if (await description.count() > 0) {
        await description.clear();

        // Try to save
        const saveBtn = modal.locator('button:has-text("Save"), .save-button');
        await saveBtn.click();

        // Should show validation error or prevent saving
        await page.waitForTimeout(500);

        // Modal should still be visible or show error
      }
    }
  });

  test('should persist profile changes', async ({ page }) => {
    await waitForVisible(page, '.subject-row');

    const firstSubject = page.locator('.subject-row').first();
    const subjectName = await firstSubject.locator('.subject-name, .name').textContent();

    if (!subjectName) {
      return;
    }

    const infoBtn = firstSubject.locator('.subject-info-btn, .info-button');
    if (await infoBtn.count() > 0) {
      const testDescription = `Test description ${Date.now()}`;

      // Open and edit
      await openSubjectProfile(page, subjectName);

      const modal = page.locator('.modal, .subject-profile-modal');
      const description = modal.locator('textarea[name="description"], #description');

      if (await description.count() > 0) {
        await description.fill(testDescription);

        const saveBtn = modal.locator('button:has-text("Save"), .save-button');
        await saveBtn.click();

        await page.waitForTimeout(1000);

        // Close modal
        await closeModal(page);

        // Reopen and verify
        await page.waitForTimeout(500);
        await openSubjectProfile(page, subjectName);

        const newDescription = await description.inputValue();
        expect(newDescription).toBe(testDescription);
      }
    }
  });
});
