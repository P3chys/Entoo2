import { test, expect } from '../../fixtures';
import { registerTestUser, login, logout } from '../helpers/auth.helper';
import * as path from 'path';
import * as fs from 'fs';

test.describe('Admin File Deletion Reproduction', () => {
    const adminUser = {
        name: 'Real Admin',
        email: 'real-admin-' + Date.now() + '@entoo.cz',
        password: 'password123'
    };

    test('real admin should be able to delete any file', async ({ page, testTxtFile }) => {
        // 1. Register a new user
        await page.goto('/register');
        await page.fill('input[name="name"]', adminUser.name);
        await page.fill('input[name="email"]', adminUser.email);
        await page.fill('input[name="password"]', adminUser.password);
        await page.fill('input[name="password_confirmation"]', adminUser.password);
        await page.click('button[type="submit"]');
        await page.waitForURL(/\/dashboard/);

        // 2. Make them an admin (using artisan via exec)
        const { exec } = require('child_process');
        const makeAdminCmd = `docker exec php php artisan tinker --execute="App\\Models\\User::where('email', '${adminUser.email}')->update(['is_admin' => true]);"`;

        await new Promise((resolve, reject) => {
            exec(makeAdminCmd, (error, stdout, stderr) => {
                if (error) {
                    console.error(`exec error: ${error}`);
                    reject(error);
                    return;
                }
                console.log(`Made user admin: ${stdout}`);
                resolve(stdout);
            });
        });

        // 3. Upload a file
        const uploadBtn = page.locator('.upload-btn-category').first();
        await uploadBtn.click();
        await page.locator('#fileInput').setInputFiles(testTxtFile.path);
        await page.locator('#uploadBtn').click();
        await page.waitForTimeout(2000); // Wait for upload

        // 4. Reload to ensure UI is fresh
        await page.reload();
        await page.waitForLoadState('networkidle');

        // 5. Try to delete the file
        // Expand subject and category to find delete button
        // (Assuming the file was uploaded to the first available subject/category)
        const subjectHeader = page.locator('.subject-header').first();
        await subjectHeader.click();

        const categoryTab = page.locator('.tab-btn').first();
        await categoryTab.click();

        // Handle confirmation dialog
        page.on('dialog', dialog => dialog.accept());

        const deleteBtn = page.locator('.delete-btn').first();
        await expect(deleteBtn).toBeVisible();
        await deleteBtn.click();

        // 6. Verify deletion success (no error alert)
        // If 403 happens, an alert appears. We can check for that or check if file is gone.
        // The previous error was an alert "Failed to delete file"

        // Wait a bit to see if alert appears
        await page.waitForTimeout(1000);

        // If the file is gone or we didn't get an error, we are good.
        // Let's verify the file is actually gone from the list
        await expect(deleteBtn).not.toBeVisible();
    });
});
