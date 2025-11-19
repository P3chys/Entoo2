import { Page, Locator } from '@playwright/test';

/**
 * Alert Component
 * Handles success/error/info alert messages
 */
export class AlertComponent {
  readonly page: Page;
  readonly successAlert: Locator;
  readonly errorAlert: Locator;
  readonly infoAlert: Locator;
  readonly warningAlert: Locator;

  constructor(page: Page) {
    this.page = page;
    this.successAlert = page.locator('.alert-success, .success-message, .toast-success');
    this.errorAlert = page.locator('.alert-danger, .alert-error, .error-message, .toast-error');
    this.infoAlert = page.locator('.alert-info, .info-message, .toast-info');
    this.warningAlert = page.locator('.alert-warning, .warning-message, .toast-warning');
  }

  /**
   * Check if success alert is visible
   */
  async hasSuccess(): Promise<boolean> {
    try {
      return await this.successAlert.isVisible({ timeout: 3000 });
    } catch {
      return false;
    }
  }

  /**
   * Check if error alert is visible
   */
  async hasError(): Promise<boolean> {
    try {
      return await this.errorAlert.isVisible({ timeout: 3000 });
    } catch {
      return false;
    }
  }

  /**
   * Check if info alert is visible
   */
  async hasInfo(): Promise<boolean> {
    try {
      return await this.infoAlert.isVisible({ timeout: 3000 });
    } catch {
      return false;
    }
  }

  /**
   * Check if warning alert is visible
   */
  async hasWarning(): Promise<boolean> {
    try {
      return await this.warningAlert.isVisible({ timeout: 3000 });
    } catch {
      return false;
    }
  }

  /**
   * Get success message text
   */
  async getSuccessMessage(): Promise<string | null> {
    try {
      return await this.successAlert.textContent({ timeout: 3000 });
    } catch {
      return null;
    }
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string | null> {
    try {
      return await this.errorAlert.textContent({ timeout: 3000 });
    } catch {
      return null;
    }
  }

  /**
   * Get info message text
   */
  async getInfoMessage(): Promise<string | null> {
    try {
      return await this.infoAlert.textContent({ timeout: 3000 });
    } catch {
      return null;
    }
  }

  /**
   * Get warning message text
   */
  async getWarningMessage(): Promise<string | null> {
    try {
      return await this.warningAlert.textContent({ timeout: 3000 });
    } catch {
      return null;
    }
  }

  /**
   * Wait for success alert
   */
  async waitForSuccess(timeout = 5000) {
    await this.successAlert.waitFor({ state: 'visible', timeout });
  }

  /**
   * Wait for error alert
   */
  async waitForError(timeout = 5000) {
    await this.errorAlert.waitFor({ state: 'visible', timeout });
  }

  /**
   * Wait for any alert to appear
   */
  async waitForAnyAlert(timeout = 5000): Promise<'success' | 'error' | 'info' | 'warning' | null> {
    try {
      await Promise.race([
        this.successAlert.waitFor({ state: 'visible', timeout }),
        this.errorAlert.waitFor({ state: 'visible', timeout }),
        this.infoAlert.waitFor({ state: 'visible', timeout }),
        this.warningAlert.waitFor({ state: 'visible', timeout })
      ]);

      if (await this.hasSuccess()) return 'success';
      if (await this.hasError()) return 'error';
      if (await this.hasInfo()) return 'info';
      if (await this.hasWarning()) return 'warning';

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Dismiss alert (if dismissible)
   */
  async dismiss() {
    const closeButtons = this.page.locator('.alert .close, .toast .close, .alert-close');
    if (await closeButtons.count() > 0) {
      await closeButtons.first().click();
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * Check if upload was successful
   */
  async hasUploadSuccess(): Promise<boolean> {
    const message = await this.getSuccessMessage();
    return message?.toLowerCase().includes('upload') || false;
  }

  /**
   * Check if deletion was successful
   */
  async hasDeleteSuccess(): Promise<boolean> {
    const message = await this.getSuccessMessage();
    return message?.toLowerCase().includes('delete') || false;
  }
}
