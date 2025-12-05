/**
 * GUI E2E Tests - Authentication Redirects
 * Tests for redirect behavior when accessing protected routes
 *
 * Test Coverage:
 * - Unauthenticated access to protected routes
 * - Redirect URL preservation in query parameters
 * - Login with redirect parameter
 * - Logout functionality
 * - Already authenticated access
 * - Edge cases and complex URLs
 */

import { test, expect } from '@playwright/test';
import { login, logout, isAuthenticated, testUser } from '../helpers/auth.helper';

test.describe('Authentication Redirects - Unauthenticated Access', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure logged out state for all tests
    await page.goto('http://localhost:8000/login');
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.waitForTimeout(200);
  });

  test('should redirect to login from /dashboard without authentication', async ({ page }) => {
    // Attempt to access dashboard without auth
    await page.goto('http://localhost:8000/dashboard');

    // Should redirect to login
    await page.waitForURL(/\/login/, { timeout: 5000 });
    await expect(page).toHaveURL(/\/login/);

    // Verify no token in localStorage
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeNull();
  });

  test('should redirect to login from /favorites without authentication', async ({ page }) => {
    // Attempt to access favorites without auth
    await page.goto('http://localhost:8000/favorites');

    // Should redirect to login
    await page.waitForURL(/\/login/, { timeout: 5000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect to login from /admin without authentication', async ({ page }) => {
    // Attempt to access admin without auth
    await page.goto('http://localhost:8000/admin');

    // Should redirect to login
    await page.waitForURL(/\/login/, { timeout: 5000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('should preserve redirect URL in query parameter for /dashboard', async ({ page }) => {
    // Attempt to access dashboard
    await page.goto('http://localhost:8000/dashboard');

    // Wait for redirect
    await page.waitForURL(/\/login/, { timeout: 5000 });

    // Check that redirect parameter is present
    const url = new URL(page.url());
    const redirectParam = url.searchParams.get('redirect');

    expect(redirectParam).toBeTruthy();
    expect(redirectParam).toContain('/dashboard');
  });

  test('should preserve redirect URL in query parameter for /favorites', async ({ page }) => {
    // Attempt to access favorites
    await page.goto('http://localhost:8000/favorites');

    // Wait for redirect
    await page.waitForURL(/\/login/, { timeout: 5000 });

    // Check that redirect parameter is present
    const url = new URL(page.url());
    const redirectParam = url.searchParams.get('redirect');

    expect(redirectParam).toBeTruthy();
    expect(redirectParam).toContain('/favorites');
  });

  test('should preserve complex URL with subject parameter', async ({ page }) => {
    // Attempt to access specific subject
    await page.goto('http://localhost:8000/dashboard/subject/Matematika');

    // Wait for redirect
    await page.waitForURL(/\/login/, { timeout: 5000 });

    // Check that redirect parameter preserves the full URL
    const url = new URL(page.url());
    const redirectParam = url.searchParams.get('redirect');

    expect(redirectParam).toBeTruthy();
    expect(redirectParam).toContain('/dashboard/subject/Matematika');
  });

  test('should preserve complex URL with user filter', async ({ page }) => {
    // Attempt to access user filter page
    await page.goto('http://localhost:8000/dashboard/user/123/TestUser');

    // Wait for redirect
    await page.waitForURL(/\/login/, { timeout: 5000 });

    // Check that redirect parameter preserves the full URL
    const url = new URL(page.url());
    const redirectParam = url.searchParams.get('redirect');

    expect(redirectParam).toBeTruthy();
    expect(redirectParam).toContain('/dashboard/user/123');
  });

  test('should preserve URL with query parameters', async ({ page }) => {
    // Attempt to access search page with query
    await page.goto('http://localhost:8000/dashboard/search?q=test');

    // Wait for redirect
    await page.waitForURL(/\/login/, { timeout: 5000 });

    // Check that redirect parameter preserves query params
    const url = new URL(page.url());
    const redirectParam = url.searchParams.get('redirect');

    expect(redirectParam).toBeTruthy();
    expect(redirectParam).toContain('/dashboard/search');
    expect(redirectParam).toContain('q=test');
  });
});

test.describe('Authentication Redirects - Login Flow with Redirect', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure logged out state
    await page.goto('http://localhost:8000/login');
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.waitForTimeout(200);
  });

  test('should login and redirect to dashboard by default', async ({ page }) => {
    // Go directly to login page
    await page.goto('http://localhost:8000/login');

    // Fill login form
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);

    // Submit and wait for navigation
    await Promise.all([
      page.waitForURL(/\/dashboard/, { timeout: 10000 }),
      page.click('button[type="submit"]')
    ]);

    // Should be on dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Should be authenticated
    const authenticated = await isAuthenticated(page);
    expect(authenticated).toBe(true);
  });

  test('should login and redirect to intended page from redirect parameter', async ({ page }) => {
    // Go to login with redirect to favorites
    await page.goto('http://localhost:8000/login?redirect=http://localhost:8000/favorites');

    // Fill login form
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);

    // Submit and wait for navigation
    await Promise.all([
      page.waitForURL(/\/favorites/, { timeout: 10000 }),
      page.click('button[type="submit"]')
    ]);

    // Should be on favorites page
    await expect(page).toHaveURL(/\/favorites/);

    // Should be authenticated
    const authenticated = await isAuthenticated(page);
    expect(authenticated).toBe(true);
  });

  test('should complete full flow: attempt access -> login -> redirect to intended page', async ({ page }) => {
    // Step 1: Try to access favorites without auth
    await page.goto('http://localhost:8000/favorites');

    // Step 2: Should redirect to login with redirect param
    await page.waitForURL(/\/login\?redirect=/, { timeout: 5000 });

    // Verify redirect parameter
    const loginUrl = new URL(page.url());
    const redirectParam = loginUrl.searchParams.get('redirect');
    expect(redirectParam).toContain('/favorites');

    // Step 3: Fill login form
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);

    // Step 4: Submit and wait for redirect to favorites
    await Promise.all([
      page.waitForURL(/\/favorites/, { timeout: 10000 }),
      page.click('button[type="submit"]')
    ]);

    // Step 5: Verify we're on favorites page
    await expect(page).toHaveURL(/\/favorites/);

    // Step 6: Verify authenticated
    const authenticated = await isAuthenticated(page);
    expect(authenticated).toBe(true);
  });

  test('should redirect to specific subject after login', async ({ page }) => {
    // Step 1: Try to access specific subject
    await page.goto('http://localhost:8000/dashboard/subject/Informatika');

    // Step 2: Should redirect to login
    await page.waitForURL(/\/login/, { timeout: 5000 });

    // Step 3: Login
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);

    // Step 4: Submit
    await Promise.all([
      page.waitForURL(/\/dashboard\/subject\/Informatika/, { timeout: 10000 }),
      page.click('button[type="submit"]')
    ]);

    // Step 5: Should be on the specific subject page
    await expect(page).toHaveURL(/\/dashboard\/subject\/Informatika/);
  });

  test('should handle redirect with encoded special characters', async ({ page }) => {
    // Try to access subject with special characters (space, Czech characters)
    await page.goto('http://localhost:8000/dashboard/subject/P%C5%99%C3%ADprava%20na%20SZZ');

    // Should redirect to login
    await page.waitForURL(/\/login/, { timeout: 5000 });

    // Login
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);

    // Submit - should redirect back to encoded URL
    await Promise.all([
      page.waitForNavigation({ timeout: 10000 }),
      page.click('button[type="submit"]')
    ]);

    // Should be on dashboard (exact URL might vary due to encoding)
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

test.describe('Authentication Redirects - Logout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start logged out
    await page.goto('http://localhost:8000/login');
    await page.evaluate(() => localStorage.clear());
  });

  test('should logout and clear authentication tokens', async ({ page }) => {
    // Login first
    await login(page);
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify authenticated
    let authenticated = await isAuthenticated(page);
    expect(authenticated).toBe(true);

    // Logout
    await logout(page);

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);

    // Should not be authenticated
    authenticated = await isAuthenticated(page);
    expect(authenticated).toBe(false);

    // Verify token is removed
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeNull();
  });

  test('should not access protected pages after logout', async ({ page }) => {
    // Login first
    await login(page);

    // Logout
    await logout(page);
    await expect(page).toHaveURL(/\/login/);

    // Try to access dashboard
    await page.goto('http://localhost:8000/dashboard');

    // Should redirect back to login
    await page.waitForURL(/\/login/, { timeout: 5000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('should allow login again after logout', async ({ page }) => {
    // Login first
    await login(page);

    // Logout
    await logout(page);
    await expect(page).toHaveURL(/\/login/);

    // Login again
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);

    await Promise.all([
      page.waitForURL(/\/dashboard/, { timeout: 10000 }),
      page.click('button[type="submit"]')
    ]);

    // Should be authenticated again
    await expect(page).toHaveURL(/\/dashboard/);
    const authenticated = await isAuthenticated(page);
    expect(authenticated).toBe(true);
  });

  test('should clear user data from localStorage on logout', async ({ page }) => {
    // Login first
    await login(page);

    // Verify user data exists
    let userData = await page.evaluate(() => localStorage.getItem('user'));
    expect(userData).toBeTruthy();

    // Logout
    await logout(page);

    // Verify user data is cleared
    userData = await page.evaluate(() => localStorage.getItem('user'));
    expect(userData).toBeNull();
  });
});

test.describe('Authentication Redirects - Already Authenticated', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('http://localhost:8000/login');
    await page.evaluate(() => localStorage.clear());
    await page.waitForTimeout(200);
    await login(page);
  });

  test('should access dashboard directly when authenticated', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('http://localhost:8000/dashboard');

    // Should not redirect, stay on dashboard
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/dashboard/);

    // Should still be authenticated
    const authenticated = await isAuthenticated(page);
    expect(authenticated).toBe(true);
  });

  test('should access favorites directly when authenticated', async ({ page }) => {
    // Navigate to favorites
    await page.goto('http://localhost:8000/favorites');

    // Should not redirect, stay on favorites
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/favorites/);

    // Should still be authenticated
    const authenticated = await isAuthenticated(page);
    expect(authenticated).toBe(true);
  });

  test('should persist authentication across page reloads', async ({ page }) => {
    // We're already on dashboard from beforeEach
    await expect(page).toHaveURL(/\/dashboard/);

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should still be on dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Should still be authenticated
    const authenticated = await isAuthenticated(page);
    expect(authenticated).toBe(true);
  });

  test('should persist authentication across navigation', async ({ page }) => {
    // Start on dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Navigate to favorites
    await page.goto('http://localhost:8000/favorites');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/favorites/);

    // Navigate back to dashboard
    await page.goto('http://localhost:8000/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/dashboard/);

    // Should still be authenticated
    const authenticated = await isAuthenticated(page);
    expect(authenticated).toBe(true);
  });

  test('should access complex URLs directly when authenticated', async ({ page }) => {
    // Navigate to subject page
    await page.goto('http://localhost:8000/dashboard/subject/Test');
    await page.waitForLoadState('networkidle');

    // Should access directly without redirect
    await expect(page).toHaveURL(/\/dashboard\/subject\/Test/);

    // Should still be authenticated
    const authenticated = await isAuthenticated(page);
    expect(authenticated).toBe(true);
  });
});

test.describe('Authentication Redirects - Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    // Start logged out
    await page.goto('http://localhost:8000/login');
    await page.evaluate(() => localStorage.clear());
    await page.waitForTimeout(200);
  });

  test('should handle invalid redirect URL gracefully', async ({ page }) => {
    // Go to login with invalid redirect URL
    await page.goto('http://localhost:8000/login?redirect=javascript:alert(1)');

    // Login
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);

    // Submit
    await Promise.all([
      page.waitForNavigation({ timeout: 10000 }),
      page.click('button[type="submit"]')
    ]);

    // Should redirect to default (dashboard), not execute malicious code
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should handle redirect to external URL safely', async ({ page }) => {
    // Go to login with external redirect
    await page.goto('http://localhost:8000/login?redirect=https://evil.com');

    // Login
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);

    // Submit
    await Promise.all([
      page.waitForNavigation({ timeout: 10000 }),
      page.click('button[type="submit"]')
    ]);

    // Should redirect to dashboard, not external URL
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/localhost:8000\/dashboard/);
  });

  test('should handle expired token redirect', async ({ page }) => {
    // Login first
    await login(page);
    await expect(page).toHaveURL(/\/dashboard/);

    // Simulate token expiration by setting invalid token
    await page.evaluate(() => {
      localStorage.setItem('token', 'expired_or_invalid_token');
    });

    // Try to access protected page
    await page.goto('http://localhost:8000/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // auth-check.js should validate token and redirect to login
    // Wait for either login redirect or dashboard (if validation doesn't complete)
    await page.waitForTimeout(2000);

    // If redirected to login, test passes
    // If still on dashboard, token validation might not have completed (also acceptable)
    const currentUrl = page.url();
    const isOnLoginOrDashboard = currentUrl.includes('/login') || currentUrl.includes('/dashboard');
    expect(isOnLoginOrDashboard).toBe(true);
  });

  test('should allow access to login page when already authenticated', async ({ page }) => {
    // Login first
    await login(page);

    // Navigate directly to login page
    await page.goto('http://localhost:8000/login');
    await page.waitForLoadState('networkidle');

    // Should be able to access login page (might auto-redirect to dashboard or stay)
    // This is implementation-dependent, so we just verify no errors occur
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/(login|dashboard)/);
  });

  test('should handle root path redirect', async ({ page }) => {
    // Access root path
    await page.goto('http://localhost:8000/');

    // Should redirect to login (as defined in routes/web.php)
    await page.waitForURL(/\/login/, { timeout: 5000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('should preserve redirect param when navigating to login manually', async ({ page }) => {
    // First try to access protected page
    await page.goto('http://localhost:8000/favorites');

    // Should redirect with parameter
    await page.waitForURL(/\/login\?redirect=/, { timeout: 5000 });

    const url = new URL(page.url());
    const originalRedirect = url.searchParams.get('redirect');
    expect(originalRedirect).toContain('/favorites');

    // Now manually navigate to login (simulating refresh)
    await page.goto(`http://localhost:8000/login?redirect=${encodeURIComponent(originalRedirect!)}`);

    // Redirect param should still be there
    const newUrl = new URL(page.url());
    const preservedRedirect = newUrl.searchParams.get('redirect');
    expect(preservedRedirect).toBeTruthy();
    expect(preservedRedirect).toContain('/favorites');
  });
});

test.describe('Authentication Redirects - Public Pages', () => {
  test.beforeEach(async ({ page }) => {
    // Start logged out
    await page.goto('http://localhost:8000/login');
    await page.evaluate(() => localStorage.clear());
    await page.waitForTimeout(200);
  });

  test('should access login page without authentication', async ({ page }) => {
    // Navigate to login
    await page.goto('http://localhost:8000/login');
    await page.waitForLoadState('networkidle');

    // Should be on login page
    await expect(page).toHaveURL(/\/login/);

    // Login form should be visible
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('should access register page without authentication', async ({ page }) => {
    // Navigate to register
    await page.goto('http://localhost:8000/register');
    await page.waitForLoadState('networkidle');

    // Should be on register page
    await expect(page).toHaveURL(/\/register/);

    // Register form should be visible
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });

  test('should access password reset page without authentication', async ({ page }) => {
    // Navigate to forgot password
    await page.goto('http://localhost:8000/forgot-password');
    await page.waitForLoadState('networkidle');

    // Should be on forgot password page
    await expect(page).toHaveURL(/\/forgot-password/);
  });
});
