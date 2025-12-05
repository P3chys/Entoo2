import { test, expect } from '@playwright/test';

test.describe('LexScholar Redesign Visual Verification', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to login page
        await page.goto('http://localhost:8000/login');
    });

    test('capture light mode dashboard', async ({ page }) => {
        // Login (adjust credentials as needed)
        await page.fill('input[name="email"]', 'admin@example.com');
        await page.fill('input[name="password"]', 'password');
        await page.click('button[type="submit"]');

        // Wait for dashboard
        await page.waitForURL('**/dashboard');
        await page.waitForTimeout(1000);

        // Ensure light mode
        await page.evaluate(() => {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
        });

        await page.waitForTimeout(500);

        // Take screenshot
        await page.screenshot({
            path: 'tests/screenshots/lexscholar-light-mode-full.png',
            fullPage: true
        });

        // Capture sidebar close-up
        const sidebar = page.locator('.sidebar');
        await sidebar.screenshot({
            path: 'tests/screenshots/lexscholar-sidebar-light.png'
        });
    });

    test('capture dark mode dashboard', async ({ page }) => {
        // Login
        await page.fill('input[name="email"]', 'admin@example.com');
        await page.fill('input[name="password"]', 'password');
        await page.click('button[type="submit"]');

        await page.waitForURL('**/dashboard');
        await page.waitForTimeout(1000);

        // Switch to dark mode
        await page.evaluate(() => {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        });

        await page.waitForTimeout(500);

        // Take screenshot
        await page.screenshot({
            path: 'tests/screenshots/lexscholar-dark-mode-full.png',
            fullPage: true
        });

        // Capture sidebar in dark mode
        const sidebar = page.locator('.sidebar');
        await sidebar.screenshot({
            path: 'tests/screenshots/lexscholar-sidebar-dark.png'
        });

        // Capture tabs if visible
        const tabs = page.locator('.tab-nav');
        if (await tabs.count() > 0) {
            await tabs.first().screenshot({
                path: 'tests/screenshots/lexscholar-tabs-dark.png'
            });
        }
    });

    test('capture theme toggle animation', async ({ page, context }) => {
        // Login
        await page.fill('input[name="email"]', 'admin@example.com');
        await page.fill('input[name="password"]', 'password');
        await page.click('button[type="submit"]');

        await page.waitForURL('**/dashboard');
        await page.waitForTimeout(1000);

        // Start in light mode
        await page.evaluate(() => {
            document.documentElement.setAttribute('data-theme', 'light');
        });
        await page.waitForTimeout(300);

        // Take before screenshot
        await page.screenshot({
            path: 'tests/screenshots/theme-toggle-before.png'
        });

        // Click theme toggle
        await page.click('#themeToggle');
        await page.waitForTimeout(500);

        // Take after screenshot
        await page.screenshot({
            path: 'tests/screenshots/theme-toggle-after.png'
        });
    });

    test('capture document card hover state', async ({ page }) => {
        // Login and navigate
        await page.fill('input[name="email"]', 'admin@example.com');
        await page.fill('input[name="password"]', 'password');
        await page.click('button[type="submit"]');

        await page.waitForURL('**/dashboard');
        await page.waitForTimeout(2000);

        // Find a subject and click it
        const subjectItem = page.locator('.subject-nav-item').first();
        if (await subjectItem.count() > 0) {
            await subjectItem.click();
            await page.waitForTimeout(1000);

            // Find a document card
            const docCard = page.locator('.document-card').first();
            if (await docCard.count() > 0) {
                // Hover over it
                await docCard.hover();
                await page.waitForTimeout(300);

                // Take screenshot
                await docCard.screenshot({
                    path: 'tests/screenshots/document-card-hover.png'
                });
            }
        }
    });
});
