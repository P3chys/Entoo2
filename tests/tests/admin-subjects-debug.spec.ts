import { test, expect } from '@playwright/test';

test('debug admin subjects loading', async ({ page }) => {
    test.setTimeout(60000);

    // Login as admin
    console.log('Navigating to login...');
    await page.goto('/login');
    await page.fill('input[name="email"]', 'pechysadam@gmail.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    console.log('Waiting for dashboard...');
    try {
        await page.waitForURL('**/dashboard', { timeout: 10000 });
    } catch (e) {
        console.log('Login timeout! Checking for errors...');
        const errorMsg = await page.locator('.alert-danger').textContent().catch(() => 'No error message found');
        console.log('Login Error Message: ' + errorMsg);
        await page.screenshot({ path: 'login-failure.png' });
        throw e;
    }

    // Click Subjects tab
    console.log('Clicking Subjects tab...');
    await page.click('button[data-tab="subjects"]');
    page.on('console', msg => console.log('BROWSER LOG: ' + msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR: ' + err.message));

    // Wait for API response
    console.log('Waiting for API response...');
    const response = await page.waitForResponse(response =>
        response.url().includes('/api/admin/subjects') && response.status() === 200
    );
    const responseBody = await response.json();
    console.log('API RESPONSE: ' + JSON.stringify(responseBody, null, 2));

    // Check if table is populated
    console.log('Checking table rows...');
    await page.waitForTimeout(1000);

    const tableRows = page.locator('#subjectsTable tbody tr');
    const count = await tableRows.count();
    console.log('TABLE ROW COUNT: ' + count);

    // Check for empty state
    const emptyState = page.locator('#subjectsTable .empty-state');
    const emptyStateVisible = await emptyState.isVisible();
    console.log('EMPTY STATE VISIBLE: ' + emptyStateVisible);

    // Take screenshot
    await page.screenshot({ path: 'admin-subjects-debug.png' });

    // Assertions
    expect(responseBody.subjects).toBeDefined();
    expect(Array.isArray(responseBody.subjects)).toBeTruthy();

    if (count === 0) {
        console.log('Table is empty. Checking if API returned data...');
        if (responseBody.subjects.length > 0) {
            console.log('CRITICAL: API returned data but table is empty! Rendering issue.');
        } else {
            console.log('API returned no data, so empty table is expected.');
        }
    } else {
        console.log('Table rows are visible. Success?');
    }
});
