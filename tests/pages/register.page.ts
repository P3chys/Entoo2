import { Page, Locator } from '@playwright/test';

/**
 * Page Object for Registration Page
 * Encapsulates all interactions with the registration page
 */
export class RegisterPage {
  readonly page: Page;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly passwordConfirmationInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly loginLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nameInput = page.locator('input[name="name"]');
    this.emailInput = page.locator('input[name="email"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.passwordConfirmationInput = page.locator('input[name="password_confirmation"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('.error, .alert-danger, .text-red-500');
    this.loginLink = page.locator('a[href*="login"]');
  }

  /**
   * Navigate to the registration page
   */
  async goto() {
    await this.page.goto('/register');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Register a new user
   */
  async register(name: string, email: string, password: string) {
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.passwordConfirmationInput.fill(password);
    await this.submitButton.click();
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
   * Navigate to login page
   */
  async goToLogin() {
    await this.loginLink.click();
    await this.page.waitForURL(/\/login/);
  }

  /**
   * Check if registration form is visible
   */
  async isFormVisible(): Promise<boolean> {
    return (
      (await this.nameInput.isVisible()) &&
      (await this.emailInput.isVisible()) &&
      (await this.passwordInput.isVisible()) &&
      (await this.passwordConfirmationInput.isVisible()) &&
      (await this.submitButton.isVisible())
    );
  }
}
