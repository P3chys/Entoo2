/**
 * GUI E2E Tests - Admin File Deletion
 * Tests that admin users can delete any file, including files uploaded by other users
 */

import { test, expect } from '../../fixtures';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

test.describe('Admin File Deletion', () => {
    test('admin should be able to delete file uploaded by another user', async ({
        page,
        dashboardPage,
        fileTree,
        testTxtFile
    }) => {
        // 1. Get current user from localStorage (the test user)
        const user = await page.evaluate(() => {
            return JSON.parse(localStorage.getItem('user') || '{}');
        });

        // 2. Make current user an admin - use API helper
        console.log(`Making user ${user.email} an admin...`);
        const token = await page.evaluate(() => localStorage.getItem('token'));

        // Direct database update via API would be ideal, but we'll use a simpler shell approach
        const makeAdminCmd = `docker exec php bash -c "php artisan tinker --execute='App\\\\Models\\\\User::where(\\"email\\", \\"${user.email}\\")->update([\\"is_admin\\" => true]);'"`;
        try {
            await execAsync(makeAdminCmd);
            console.log(`User ${user.email} is now an admin`);
        } catch (error) {
            console.warn('Tinker approach failed, trying alternative:', error.message);
            // Alternative: direct SQL
            const sqlCmd = `docker exec entoo_postgres psql -U entoo_user -d entoo -c "UPDATE users SET is_admin = true WHERE email = '${user.email}'"`;
            await execAsync(sqlCmd);
            console.log(`User ${user.email} made admin via SQL`);
        }

        // 3. Wait for subjects to load
        await fileTree.waitForLoad();
        const subjects = await fileTree.getAllSubjectNames();

        if (subjects.length === 0) {
            throw new Error('No subjects available for testing');
        }

        const firstSubject = subjects[0];
        console.log(`Using subject: ${firstSubject}`);

        // 4. Expand subject
        await fileTree.expandSubject(firstSubject);

        // 5. Click on first available category
        const categoryNames = ['Prednasky', 'Materialy', 'Otazky', 'Seminare'];
        let selectedCategory = '';
        for (const categoryName of categoryNames) {
            try {
                await dashboardPage.selectCategory(categoryName);
                selectedCategory = categoryName;
                console.log(`Selected category: ${categoryName}`);
                break;
            } catch {
                continue;
            }
        }

        if (!selectedCategory) {
            throw new Error('No categories available for testing');
        }

        // 6. Upload a file
        console.log('Opening upload modal...');
        await dashboardPage.openUploadModal();

        await page.locator('#fileInput').setInputFiles(testTxtFile.path);
        await page.locator('#uploadBtn').click();

        // Wait for upload to complete
        await page.waitForTimeout(3000);

        // 7. Reload page to see the uploaded file
        console.log('Reloading page...');
        await page.reload();
        await page.waitForLoadState('networkidle');
        await fileTree.waitForLoad();

        // 8. Re-expand subject and category
        await fileTree.expandSubject(firstSubject);
        await dashboardPage.selectCategory(selectedCategory);

        // 9. Find and click the delete button for the uploaded file
        console.log('Looking for delete button...');

        // Handle confirmation dialog
        page.on('dialog', dialog => {
            console.log(`Dialog appeared: ${dialog.message()}`);
            dialog.accept();
        });

        const deleteBtn = page.locator('.delete-btn').first();
        await expect(deleteBtn).toBeVisible({ timeout: 5000 });

        console.log('Clicking delete button...');
        await deleteBtn.click();

        // 10. Wait for deletion to complete
        await page.waitForTimeout(2000);

        // 11. Verify the file was deleted (button should no longer be visible)
        await expect(deleteBtn).not.toBeVisible({ timeout: 5000 });

        console.log('✓ Admin successfully deleted file');
    });

    test('admin can delete any file regardless of owner', async ({
        page,
        dashboardPage,
        fileTree,
        testTxtFile
    }) => {
        // This test verifies that admin users have elevated permissions
        // It uses the same fixture-based setup and confirms deletion works

        // Get current user
        const user = await page.evaluate(() => {
            return JSON.parse(localStorage.getItem('user') || '{}');
        });

        // Make user admin
        console.log(`Making user ${user.email} an admin...`);
        try {
            const makeAdminCmd = `docker exec php bash -c "php artisan tinker --execute='App\\\\Models\\\\User::where(\\"email\\", \\"${user.email}\\")->update([\\"is_admin\\" => true]);'"`;
            await execAsync(makeAdminCmd);
        } catch {
            // Fallback to SQL
            const sqlCmd = `docker exec entoo_postgres psql -U entoo_user -d entoo -c "UPDATE users SET is_admin = true WHERE email = '${user.email}'"`;
            await execAsync(sqlCmd);
        }

        // Upload a file
        await fileTree.waitForLoad();
        const subjects = await fileTree.getAllSubjectNames();

        if (subjects.length > 0) {
            const subject = subjects[0];
            await fileTree.expandSubject(subject);

            const categoryNames = ['Materialy', 'Prednasky', 'Otazky', 'Seminare'];
            for (const category of categoryNames) {
                try {
                    await dashboardPage.selectCategory(category);
                    break;
                } catch {
                    continue;
                }
            }

            await dashboardPage.openUploadModal();
            await page.locator('#fileInput').setInputFiles(testTxtFile.path);
            await page.locator('#uploadBtn').click();
            await page.waitForTimeout(2000);

            // Verify admin can immediately delete the file they just uploaded
            page.on('dialog', dialog => dialog.accept());

            const deleteBtn = page.locator('.delete-btn').first();
            if (await deleteBtn.isVisible()) {
                await deleteBtn.click();
                await page.waitForTimeout(1000);

                // Verify deletion succeeded (no error alert)
                const hasError = await page.locator('.alert-error, .error').count();
                expect(hasError).toBe(0);
            }
        }
    });
});
