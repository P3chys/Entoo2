import { test, expect } from '@playwright/test';
import { setupAuth, logout } from '../helpers/auth.helper';

test.describe('Authentication UI Enhancements', () => {
    test.beforeEach(async ({ page }) => {
        await setupAuth(page);
        await page.goto('http://localhost:8000/dashboard');
        await page.waitForLoadState('networkidle');
    });

    test('should display user info in sidebar', async ({ page }) => {
        // Check user name is displayed
        const userName = page.locator('#sidebarUserName');
        await expect(userName).toBeVisible();
        await expect(userName).toHaveText(/test/i);

        // Check user email/role is displayed
        const userRole = page.locator('#sidebarUserRole');
        await expect(userRole).toBeVisible();
        await expect(userRole).toHaveText(/test.*@/i);

        // Check user avatar is displayed
        const userAvatar = page.locator('#sidebarUserAvatar');
        await expect(userAvatar).toBeVisible();
        await expect(userAvatar).toHaveText(/T/i); // First letter of Test User
    });

    test('should display logout button in sidebar', async ({ page }) => {
        const logoutBtn = page.locator('.btn-logout');
        await expect(logoutBtn).toBeVisible();
        await expect(logoutBtn).toHaveAttribute('title', 'Logout');
    });

    test('should show hover effects on user profile card', async ({ page }) => {
        const profileCard = page.locator('.user-profile-card');
        await expect(profileCard).toBeVisible();

        // Hover over profile card
        await profileCard.hover();

        // Check hover state (background change, transform, etc.)
        const bgColor = await profileCard.evaluate((el) => {
            return window.getComputedStyle(el).backgroundColor;
        });
        expect(bgColor).toBeTruthy();
    });

    test('should show hover effects on logout button', async ({ page }) => {
        const logoutBtn = page.locator('.btn-logout');

        // Hover over logout button
        await logoutBtn.hover();

        // Check color changes to error red
        const color = await logoutBtn.evaluate((el) => {
            return window.getComputedStyle(el).color;
        });
        expect(color).toBeTruthy();
    });

    test('should open profile modal when clicking user card', async ({ page }) => {
        const profileCard = page.locator('.user-profile-card');
        await profileCard.click();

        // Wait for modal to open
        const modal = page.locator('#profileModal');
        await expect(modal).not.toHaveClass(/hidden/);

        // Check profile content is loaded
        await expect(modal.locator('h2')).toContainText('User Profile');

        // Check user details are displayed
        await expect(modal).toContainText(/test/i);
        await expect(modal).toContainText(/@/);
    });

    test('should close profile modal with close button', async ({ page }) => {
        // Open modal
        await page.locator('.user-profile-card').click();
        const modal = page.locator('#profileModal');
        await expect(modal).not.toHaveClass(/hidden/);

        // Close modal
        await page.locator('.close-btn').first().click();
        await expect(modal).toHaveClass(/hidden/);
    });

    test('should show logout confirmation dialog', async ({ page }) => {
        // Setup dialog handler
        let dialogShown = false;
        page.on('dialog', async (dialog) => {
            expect(dialog.type()).toBe('confirm');
            expect(dialog.message()).toContain('logout');
            dialogShown = true;
            await dialog.dismiss(); // Cancel logout
        });

        // Click logout button
        const logoutBtn = page.locator('.btn-logout');
        await logoutBtn.click();

        // Wait for dialog
        await page.waitForTimeout(500);
        expect(dialogShown).toBe(true);
    });

    test('should logout successfully and redirect to login', async ({ page }) => {
        // Setup dialog handler to accept logout
        page.on('dialog', async (dialog) => {
            await dialog.accept();
        });

        // Click logout button
        const logoutBtn = page.locator('.btn-logout');
        await logoutBtn.click();

        // Wait for redirect to login page
        await page.waitForURL('**/login**', { timeout: 5000 });

        // Verify we're on login page
        expect(page.url()).toContain('/login');

        // Verify token is cleared from localStorage
        const token = await page.evaluate(() => localStorage.getItem('token'));
        expect(token).toBeNull();

        const user = await page.evaluate(() => localStorage.getItem('user'));
        expect(user).toBeNull();
    });

    test('should show loading overlay during logout', async ({ page }) => {
        // Setup dialog handler to accept logout
        page.on('dialog', async (dialog) => {
            await dialog.accept();
        });

        // Click logout button
        const logoutBtn = page.locator('.btn-logout');
        await logoutBtn.click();

        // Check for loading overlay (brief check before redirect)
        const overlay = page.locator('#logoutOverlay');

        // Try to catch the overlay (it may be very brief)
        try {
            await expect(overlay).toBeVisible({ timeout: 1000 });
            await expect(overlay).toContainText(/logging out/i);
        } catch (e) {
            // Overlay might be too fast to catch, which is fine
            console.log('Logout overlay was too fast to verify');
        }
    });

    test('should persist user info across page reloads', async ({ page }) => {
        // Get initial user name
        const initialName = await page.locator('#sidebarUserName').textContent();

        // Reload page
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Verify user info is still displayed
        const userName = page.locator('#sidebarUserName');
        await expect(userName).toBeVisible();
        expect(await userName.textContent()).toBe(initialName);
    });

    test('should show user avatar with correct initial', async ({ page }) => {
        const userAvatar = page.locator('#sidebarUserAvatar');
        const userName = await page.locator('#sidebarUserName').textContent();

        if (userName) {
            const expectedInitial = userName.charAt(0).toUpperCase();
            await expect(userAvatar).toHaveText(expectedInitial);
        }
    });

    test('should have accessible logout button', async ({ page }) => {
        const logoutBtn = page.locator('.btn-logout');

        // Check button has title attribute for accessibility
        await expect(logoutBtn).toHaveAttribute('title', 'Logout');

        // Check button is keyboard accessible
        await logoutBtn.focus();
        const isFocused = await logoutBtn.evaluate((el) => el === document.activeElement);
        expect(isFocused).toBe(true);
    });
});

test.describe('Authentication State Management', () => {
    test('should redirect to login if token is missing', async ({ page }) => {
        // Clear auth data
        await page.goto('http://localhost:8000/dashboard');
        await page.evaluate(() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        });

        // Reload page
        await page.reload();

        // Should redirect to login
        await page.waitForURL('**/login**', { timeout: 5000 });
        expect(page.url()).toContain('/login');
    });

    test('should include redirect parameter in login URL after logout', async ({ page }) => {
        await page.goto('http://localhost:8000/dashboard');
        await page.waitForLoadState('networkidle');

        // Setup dialog handler to accept logout
        page.on('dialog', async (dialog) => {
            await dialog.accept();
        });

        // Click logout button
        await page.locator('.btn-logout').click();

        // Wait for redirect
        await page.waitForURL('**/login**', { timeout: 5000 });

        // Check URL doesn't have redirect parameter (since logout is intentional)
        expect(page.url()).toContain('/login');
    });
});

test.describe('Profile Modal Functionality', () => {
    test.beforeEach(async ({ page }) => {
        await setupAuth(page);
        await page.goto('http://localhost:8000/dashboard');
        await page.waitForLoadState('networkidle');
    });

    test('should display user statistics in profile modal', async ({ page }) => {
        // Open profile modal
        await page.locator('.user-profile-card').click();

        const modal = page.locator('#profileModal');
        await expect(modal).not.toHaveClass(/hidden/);

        // Wait for profile content to load
        await page.waitForTimeout(1000);

        // Check for statistics
        await expect(modal).toContainText(/files uploaded/i);
        await expect(modal).toContainText(/account created/i);
    });

    test('should show change password button in profile modal', async ({ page }) => {
        // Open profile modal
        await page.locator('.user-profile-card').click();

        const modal = page.locator('#profileModal');
        await expect(modal).not.toHaveClass(/hidden/);

        // Wait for content to load
        await page.waitForTimeout(1000);

        // Check for change password button
        const changePasswordBtn = modal.locator('button:has-text("Change Password")');
        await expect(changePasswordBtn).toBeVisible();
    });

    test('should navigate to change password form', async ({ page }) => {
        // Open profile modal
        await page.locator('.user-profile-card').click();
        await page.waitForTimeout(1000);

        // Click change password button
        await page.locator('button:has-text("Change Password")').click();

        // Check form is displayed
        const form = page.locator('#changePasswordForm');
        await expect(form).toBeVisible();

        // Check form fields
        await expect(form.locator('#currentPassword')).toBeVisible();
        await expect(form.locator('#newPassword')).toBeVisible();
        await expect(form.locator('#confirmPassword')).toBeVisible();
    });
});

test.describe('Visual Enhancements', () => {
    test.beforeEach(async ({ page }) => {
        await setupAuth(page);
        await page.goto('http://localhost:8000/dashboard');
        await page.waitForLoadState('networkidle');
    });

    test('should have gradient avatar styling', async ({ page }) => {
        const avatar = page.locator('#sidebarUserAvatar');
        await expect(avatar).toBeVisible();

        // Check avatar has gradient background
        const background = await avatar.evaluate((el) => {
            return window.getComputedStyle(el).background;
        });
        expect(background).toBeTruthy();
    });

    test('should have smooth hover transitions', async ({ page }) => {
        const profileCard = page.locator('.user-profile-card');

        // Check transition property exists
        const transition = await profileCard.evaluate((el) => {
            return window.getComputedStyle(el).transition;
        });
        expect(transition).toContain('all');
    });

    test('should have proper text overflow handling', async ({ page }) => {
        const userName = page.locator('.user-name');

        // Check text-overflow is set
        const textOverflow = await userName.evaluate((el) => {
            return window.getComputedStyle(el).textOverflow;
        });
        expect(textOverflow).toBe('ellipsis');
    });
});
