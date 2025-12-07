import { test, expect } from '@playwright/test';
import { setupAuth } from '../helpers/auth.helper';
import { createSubjectProfile, deleteSubjectProfile } from '../helpers/api.helper';

test.describe('6-Semester Grouping Feature', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
  });

  test('should display all 6 semester groups in sidebar', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('http://localhost:8000/dashboard');
    await page.waitForLoadState('networkidle');

    // Check that all 6 semester groups exist in the sidebar
    await expect(page.locator('text=SEMESTER 1')).toBeVisible();
    await expect(page.locator('text=SEMESTER 2')).toBeVisible();
    await expect(page.locator('text=SEMESTER 3')).toBeVisible();
    await expect(page.locator('text=SEMESTER 4')).toBeVisible();
    await expect(page.locator('text=SEMESTER 5')).toBeVisible();
    await expect(page.locator('text=SEMESTER 6')).toBeVisible();
    await expect(page.locator('text=NON-ASSIGNED')).toBeVisible();
  });

  test('should allow creating subject profiles with semesters 1-6', async ({ page }) => {
    const testSubjects = [
      { name: 'Test Subject Semester 1', semester: '1' },
      { name: 'Test Subject Semester 2', semester: '2' },
      { name: 'Test Subject Semester 3', semester: '3' },
      { name: 'Test Subject Semester 4', semester: '4' },
      { name: 'Test Subject Semester 5', semester: '5' },
      { name: 'Test Subject Semester 6', semester: '6' },
    ];

    for (const subject of testSubjects) {
      // Create subject profile via API
      await createSubjectProfile(page, {
        subject_name: subject.name,
        description: `Test subject for semester ${subject.semester}`,
        semester: parseInt(subject.semester),
        credits: 5,
      });
    }

    // Navigate to dashboard and verify subjects appear in correct semester groups
    await page.goto('http://localhost:8000/dashboard');
    await page.waitForLoadState('networkidle');

    // Force reload to bypass cache
    await page.reload({ waitUntil: 'networkidle' });

    // Wait for sidebar to be populated
    await page.waitForTimeout(2000);

    // Verify each subject appears in the correct semester group
    for (const subject of testSubjects) {
      const semesterGroupId = `semester${subject.semester}Subjects`;
      const semesterGroup = page.locator(`#${semesterGroupId}`);

      // Check if the subject appears in the correct semester group
      const subjectInGroup = semesterGroup.locator(`text="${subject.name}"`);
      await expect(subjectInGroup).toBeVisible({ timeout: 10000 });
    }

    // Cleanup: delete all test subjects
    for (const subject of testSubjects) {
      await deleteSubjectProfile(page, subject.name);
    }
  });

  test('should show all 6 semester options in subject profile modal', async ({ page }) => {
    // Create a test subject first
    const testSubjectName = 'Test Subject for Modal';
    await createSubjectProfile(page, {
      subject_name: testSubjectName,
      description: 'Test subject',
      semester: 1,
    });

    await page.goto('http://localhost:8000/dashboard');
    await page.waitForLoadState('networkidle');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Click on a subject to expand it
    const subjectItem = page.locator(`.subject-nav-item[data-subject="${testSubjectName}"]`).first();
    await expect(subjectItem).toBeVisible({ timeout: 10000 });
    await subjectItem.click();
    await page.waitForTimeout(1000);

    // Click the "Edit Profile" button in the expanded panel
    const editButton = page.locator('button:has-text("Edit Profile")').first();
    await expect(editButton).toBeVisible({ timeout: 5000 });
    await editButton.click();

    // Wait for modal to open
    await page.waitForSelector('#subjectProfileModal:not(.hidden)', { timeout: 5000 });

    // Verify all 6 semester options are present in the dropdown
    const semesterSelect = page.locator('#profileSemester');
    await expect(semesterSelect).toBeVisible();

    // Get all options
    const options = await semesterSelect.locator('option').allTextContents();

    // Verify we have 8 options total (empty + 6 semesters + possibly other)
    expect(options.length).toBeGreaterThanOrEqual(7);

    // Verify specific semester options exist
    expect(options.some(opt => opt.includes('Semester 1'))).toBeTruthy();
    expect(options.some(opt => opt.includes('Semester 2'))).toBeTruthy();
    expect(options.some(opt => opt.includes('Semester 3'))).toBeTruthy();
    expect(options.some(opt => opt.includes('Semester 4'))).toBeTruthy();
    expect(options.some(opt => opt.includes('Semester 5'))).toBeTruthy();
    expect(options.some(opt => opt.includes('Semester 6'))).toBeTruthy();

    // Close modal
    const closeButton = page.locator('#subjectProfileModal button.close-btn');
    await closeButton.click();

    // Cleanup
    await deleteSubjectProfile(page, testSubjectName);
  });

  test('should allow updating subject semester from 1 to 6', async ({ page }) => {
    const testSubjectName = 'Test Subject Semester Update';

    // Create subject with semester 1
    await createSubjectProfile(page, {
      subject_name: testSubjectName,
      description: 'Test subject for semester update',
      semester: 1,
    });

    await page.goto('http://localhost:8000/dashboard');
    await page.waitForLoadState('networkidle');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Verify subject is in semester 1
    const semester1Group = page.locator('#semester1Subjects');
    await expect(semester1Group.locator(`text="${testSubjectName}"`)).toBeVisible({ timeout: 10000 });

    // Click subject to expand
    const subjectItem = page.locator(`.subject-nav-item[data-subject="${testSubjectName}"]`).first();
    await subjectItem.click();
    await page.waitForTimeout(1000);

    // Open edit modal
    const editButton = page.locator('button:has-text("Edit Profile")').first();
    await editButton.click();
    await page.waitForSelector('#subjectProfileModal:not(.hidden)');

    // Change semester to 6
    const semesterSelect = page.locator('#profileSemester');
    await semesterSelect.selectOption('6');

    // Save
    const saveButton = page.locator('#subjectProfileModal button[type="submit"]:has-text("Save")');
    await saveButton.click();

    // Wait for modal to close and page to reload
    await page.waitForTimeout(3000);

    // Reload page to see changes
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Verify subject moved to semester 6
    const semester6Group = page.locator('#semester6Subjects');
    await expect(semester6Group.locator(`text="${testSubjectName}"`)).toBeVisible({ timeout: 10000 });

    // Verify it's NOT in semester 1 anymore
    const semester1AfterUpdate = page.locator('#semester1Subjects');
    await expect(semester1AfterUpdate.locator(`text="${testSubjectName}"`)).not.toBeVisible();

    // Cleanup
    await deleteSubjectProfile(page, testSubjectName);
  });

  test('should show all 6 semester options in admin dashboard', async ({ page }) => {
    // First verify user is admin (this test requires admin access)
    await page.goto('http://localhost:8000/admin');

    // If redirected to dashboard, user is not admin - skip test
    if (page.url().includes('/dashboard')) {
      test.skip();
      return;
    }

    await page.waitForLoadState('networkidle');

    // Navigate to Subjects tab
    const subjectsTab = page.locator('button.admin-tab[data-tab="subjects"]');
    await expect(subjectsTab).toBeVisible();
    await subjectsTab.click();

    // Click Create Subject button
    const createButton = page.locator('#createSubjectBtn');
    await expect(createButton).toBeVisible();
    await createButton.click();

    // Wait for modal
    await page.waitForSelector('#subjectModal.show');

    // Check semester dropdown has all 6 options
    const semesterSelect = page.locator('#subjectSemester');
    const options = await semesterSelect.locator('option').allTextContents();

    expect(options.some(opt => opt.includes('Semester 1'))).toBeTruthy();
    expect(options.some(opt => opt.includes('Semester 2'))).toBeTruthy();
    expect(options.some(opt => opt.includes('Semester 3'))).toBeTruthy();
    expect(options.some(opt => opt.includes('Semester 4'))).toBeTruthy();
    expect(options.some(opt => opt.includes('Semester 5'))).toBeTruthy();
    expect(options.some(opt => opt.includes('Semester 6'))).toBeTruthy();
  });

  test('should correctly group subjects in all semesters after bulk creation', async ({ page }) => {
    // Create multiple subjects in each semester
    const subjects = [
      { name: 'Math 1A', semester: 1 },
      { name: 'Math 1B', semester: 1 },
      { name: 'Physics 2A', semester: 2 },
      { name: 'Chemistry 3A', semester: 3 },
      { name: 'Biology 4A', semester: 4 },
      { name: 'History 5A', semester: 5 },
      { name: 'Art 6A', semester: 6 },
      { name: 'Other Subject', semester: null },
    ];

    // Create all subjects
    for (const subject of subjects) {
      await createSubjectProfile(page, {
        subject_name: subject.name,
        description: `Test subject for semester ${subject.semester || 'other'}`,
        semester: subject.semester,
      });
    }

    // Navigate and reload
    await page.goto('http://localhost:8000/dashboard');
    await page.waitForLoadState('networkidle');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Verify each subject is in the correct group
    for (const subject of subjects) {
      if (subject.semester) {
        const groupId = `semester${subject.semester}Subjects`;
        const group = page.locator(`#${groupId}`);
        await expect(group.locator(`text="${subject.name}"`)).toBeVisible({ timeout: 10000 });
      } else {
        const otherGroup = page.locator('#otherSubjects');
        await expect(otherGroup.locator(`text="${subject.name}"`)).toBeVisible({ timeout: 10000 });
      }
    }

    // Cleanup
    for (const subject of subjects) {
      await deleteSubjectProfile(page, subject.name);
    }
  });

  test('should validate semester field accepts values 1-6 only', async ({ page }) => {
    const testSubjectName = 'Test Semester Validation';

    // Try to create with valid semesters (1-6) via modal
    await page.goto('http://localhost:8000/dashboard');
    await page.waitForLoadState('networkidle');

    // Create a test subject first
    await createSubjectProfile(page, {
      subject_name: testSubjectName,
      semester: 3,
    });

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Open subject
    const subjectItem = page.locator(`.subject-nav-item[data-subject="${testSubjectName}"]`).first();
    await expect(subjectItem).toBeVisible({ timeout: 10000 });
    await subjectItem.click();
    await page.waitForTimeout(1000);

    // Open modal
    const editButton = page.locator('button:has-text("Edit Profile")').first();
    await editButton.click();
    await page.waitForSelector('#subjectProfileModal:not(.hidden)');

    // Verify only valid semester options are available
    const semesterSelect = page.locator('#profileSemester');
    const optionValues = await semesterSelect.locator('option').evaluateAll(options =>
      options.map(opt => opt.getAttribute('value')).filter(v => v !== '')
    );

    // Should only contain '1', '2', '3', '4', '5', '6'
    for (const value of optionValues) {
      const numValue = parseInt(value);
      expect(numValue).toBeGreaterThanOrEqual(1);
      expect(numValue).toBeLessThanOrEqual(6);
    }

    // Cleanup
    const closeBtn = page.locator('#subjectProfileModal button.close-btn');
    await closeBtn.click();
    await deleteSubjectProfile(page, testSubjectName);
  });
});
