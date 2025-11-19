import { Page, Locator } from '@playwright/test';

/**
 * Page Object for Login Page
 * Encapsulates all interactions with the login page
 */
export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;
  readonly registerLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[name="email"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.loginButton = page.locator('#loginBtn, button:has-text("Login")').first();
    this.errorMessage = page.locator('.error, .alert-danger, .text-red-500');
    this.registerLink = page.locator('a[href*="register"]');
  }

  /**
   * Navigate to the login page
   */
  async goto() {
    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Perform login with credentials
   */
  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  /**
   * Check if error message is visible
   */
  async hasError(): Promise<boolean> {
    try {
      return await this.errorMessage.isVisible({ timeout: 3000 });
    } catch {
      return false;
    }
  }

  /**
   * Check if rate limit error is shown
   */
  async hasRateLimitError(): Promise<boolean> {
    try {
      const rateLimitError = this.page.locator('text=/Too Many Attempts/i');
      return await rateLimitError.isVisible({ timeout: 2000 });
    } catch {
      return false;
    }
  }

  /**
   * Navigate to registration page
   */
  async goToRegister() {
    await this.registerLink.click();
    await this.page.waitForURL(/\/register/);
  }

  /**
   * Check if login form is visible
   */
  async isFormVisible(): Promise<boolean> {
    return (
      (await this.emailInput.isVisible()) &&
      (await this.passwordInput.isVisible()) &&
      (await this.loginButton.isVisible())
    );
  }
}
