import { test, expect } from '@playwright/test';

test.describe('Theme Toggle Functionality', () => {
  const baseUrl = 'http://localhost:8000';

  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto(baseUrl);
    await page.evaluate(() => localStorage.clear());
  });

  test('should have theme toggle button visible in navbar', async ({ page }) => {
    await page.goto(baseUrl);

    const themeToggle = page.locator('#themeToggle');
    await expect(themeToggle).toBeVisible();

    const themeIcon = page.locator('#themeIcon');
    await expect(themeIcon).toBeVisible();

    // Default theme should be light (moon icon)
    await expect(themeIcon).toHaveText('🌙');
  });

  test('should toggle to dark mode when clicked', async ({ page }) => {
    await page.goto(baseUrl);

    const themeToggle = page.locator('#themeToggle');
    const themeIcon = page.locator('#themeIcon');

    // Verify initial light theme
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(themeIcon).toHaveText('🌙');

    // Click to switch to dark mode
    await themeToggle.click();

    // Wait for animation to complete
    await page.waitForTimeout(600);

    // Verify dark mode is active
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(themeIcon).toHaveText('☀️');
  });

  test('should toggle back to light mode when clicked twice', async ({ page }) => {
    await page.goto(baseUrl);

    const themeToggle = page.locator('#themeToggle');
    const themeIcon = page.locator('#themeIcon');

    // Toggle to dark
    await themeToggle.click();
    await page.waitForTimeout(600);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // Toggle back to light
    await themeToggle.click();
    await page.waitForTimeout(600);

    // Verify back to light mode
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(themeIcon).toHaveText('🌙');
  });

  test('should persist theme selection in localStorage', async ({ page }) => {
    await page.goto(baseUrl);

    const themeToggle = page.locator('#themeToggle');

    // Switch to dark mode
    await themeToggle.click();
    await page.waitForTimeout(600);

    // Verify localStorage has dark theme saved
    const savedTheme = await page.evaluate(() => localStorage.getItem('theme'));
    expect(savedTheme).toBe('dark');
  });

  test('should load saved theme preference on page reload', async ({ page }) => {
    await page.goto(baseUrl);

    const themeToggle = page.locator('#themeToggle');
    const themeIcon = page.locator('#themeIcon');

    // Set dark mode
    await themeToggle.click();
    await page.waitForTimeout(600);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // Reload the page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Theme should still be dark after reload
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(themeIcon).toHaveText('☀️');
  });

  test('should apply dark mode data attribute correctly', async ({ page }) => {
    await page.goto(baseUrl);

    const themeToggle = page.locator('#themeToggle');
    const htmlElement = page.locator('html');

    // Verify light mode is active initially
    await expect(htmlElement).toHaveAttribute('data-theme', 'light');

    // Switch to dark mode
    await themeToggle.click();
    await page.waitForTimeout(600);

    // Verify dark mode attribute is set
    await expect(htmlElement).toHaveAttribute('data-theme', 'dark');

    // Switch back to light mode
    await themeToggle.click();
    await page.waitForTimeout(600);

    // Verify light mode is restored
    await expect(htmlElement).toHaveAttribute('data-theme', 'light');
  });

  test('should animate icon during theme toggle', async ({ page }) => {
    await page.goto(baseUrl);

    const themeToggle = page.locator('#themeToggle');
    const themeIcon = page.locator('#themeIcon');

    // Click toggle
    await themeToggle.click();

    // Icon should have rotate class during animation
    await expect(themeIcon).toHaveClass(/rotate/);

    // Wait for animation to complete
    await page.waitForTimeout(600);

    // Rotate class should be removed after animation
    await expect(themeIcon).not.toHaveClass(/rotate/);
  });

  test('should maintain theme across navigation', async ({ page }) => {
    await page.goto(baseUrl);

    const themeToggle = page.locator('#themeToggle');

    // Set dark mode on home page
    await themeToggle.click();
    await page.waitForTimeout(600);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // Navigate to login page
    await page.goto(`${baseUrl}/login`);
    await page.waitForLoadState('domcontentloaded');

    // Theme should still be dark
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('#themeIcon')).toHaveText('☀️');
  });

  test('should handle rapid toggle clicks correctly', async ({ page }) => {
    await page.goto(baseUrl);

    const themeToggle = page.locator('#themeToggle');

    // Click multiple times rapidly
    await themeToggle.click();
    await themeToggle.click();
    await themeToggle.click();

    // Wait for all animations
    await page.waitForTimeout(1000);

    // Should end up in dark mode (odd number of clicks)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // localStorage should match
    const savedTheme = await page.evaluate(() => localStorage.getItem('theme'));
    expect(savedTheme).toBe('dark');
  });

  test('should remain functional in both themes', async ({ page }) => {
    await page.goto(baseUrl);

    const themeToggle = page.locator('#themeToggle');

    // Verify button is visible and clickable in light mode
    await expect(themeToggle).toBeVisible();
    await expect(themeToggle).toBeEnabled();

    // Switch to dark mode
    await themeToggle.click();
    await page.waitForTimeout(600);

    // Verify button still visible and functional in dark mode
    await expect(themeToggle).toBeVisible();
    await expect(themeToggle).toBeEnabled();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // Verify it can still be clicked (toggle back)
    await themeToggle.click();
    await page.waitForTimeout(600);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('should work alongside other navbar functionality', async ({ page }) => {
    await page.goto(baseUrl);

    const themeToggle = page.locator('#themeToggle');
    const loginLink = page.locator('a[href="/login"]');

    // Verify theme toggle doesn't interfere with other navbar elements
    await expect(themeToggle).toBeVisible();
    await expect(loginLink).toBeVisible();

    // Toggle theme
    await themeToggle.click();
    await page.waitForTimeout(600);

    // Other navbar elements should still work
    await expect(loginLink).toBeVisible();
    await expect(loginLink).toBeEnabled();
  });
});
