/**
 * Authentication Helper for E2E Tests
 * Provides utilities for login, logout, and auth state management
 */

import { Page, expect } from '@playwright/test';

export interface TestUser {
  email: string;
  password: string;
  name: string;
}

export const testUser: TestUser = {
  email: 'test@entoo.cz',
  password: 'password123',
  name: 'Test User'
};

/**
 * Register a new test user (if not exists)
 */
export async function registerTestUser(page: Page): Promise<void> {
  await page.goto('/register');

  await page.fill('input[name="name"]', testUser.name);
  await page.fill('input[name="email"]', testUser.email);
  await page.fill('input[name="password"]', testUser.password);
  await page.fill('input[name="password_confirmation"]', testUser.password);

  await page.click('button[type="submit"]');

  // Wait for successful registration or login redirect
  await page.waitForURL(/\/(dashboard|login)/, { timeout: 5000 }).catch(() => {
    // User might already exist, that's okay
  });
}

/**
 * Login with test user credentials
 */
export async function login(page: Page, user: TestUser = testUser): Promise<void> {
  await page.goto('/login');

  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);

  await page.click('button[type="submit"]');

  // Wait for successful login and redirect to dashboard
  await page.waitForURL('/dashboard', { timeout: 5000 });

  // Verify token is stored
  const token = await page.evaluate(() => localStorage.getItem('token'));
  expect(token).toBeTruthy();
}

/**
 * Logout and clear authentication
 */
export async function logout(page: Page): Promise<void> {
  // Try to find and click logout button
  try {
    await page.click('button:has-text("Logout")', { timeout: 2000 });
  } catch {
    // If no logout button, clear localStorage directly
    await page.evaluate(() => localStorage.removeItem('token'));
  }

  await page.goto('/login');
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    return !!token;
  } catch (error) {
    // localStorage might not be accessible (e.g., about:blank page)
    return false;
  }
}

/**
 * Ensure user is logged in (register if needed, then login)
 */
export async function ensureLoggedIn(page: Page): Promise<void> {
  // Navigate to login page first to check auth state
  await page.goto('/login');

  // Check if we're redirected to dashboard (already authenticated)
  await page.waitForTimeout(500);

  if (page.url().includes('/dashboard')) {
    // Already authenticated
    return;
  }

  // Try to login first
  try {
    await login(page);
  } catch (error) {
    // If login fails, try to register
    try {
      await registerTestUser(page);
      // Then login
      await login(page);
    } catch (registerError) {
      // Registration might fail if user exists, try login again
      await login(page);
    }
  }
}

/**
 * Setup authentication state for tests
 * Use this in test.beforeEach() for authenticated tests
 */
export async function setupAuth(page: Page): Promise<void> {
  await ensureLoggedIn(page);

  // Wait for dashboard to be fully loaded
  await page.waitForLoadState('networkidle');

  // Verify we're on the dashboard
  await expect(page).toHaveURL(/\/dashboard/);
}
