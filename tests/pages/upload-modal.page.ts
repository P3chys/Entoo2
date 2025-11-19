import { Page, Locator } from '@playwright/test';

/**
 * Page Object for Upload Modal
 * Encapsulates all interactions with the file upload modal
 */
export class UploadModalPage {
  readonly page: Page;
  readonly modal: Locator;
  readonly fileInput: Locator;
  readonly uploadContext: Locator;
  readonly uploadButton: Locator;
  readonly closeButton: Locator;
  readonly uploadProgress: Locator;
  readonly uploadSuccess: Locator;
  readonly uploadError: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modal = page.locator('#uploadModal');
    this.fileInput = page.locator('#fileInput');
    this.uploadContext = page.locator('#uploadContext');
    this.uploadButton = page.locator('#uploadBtn');
    this.closeButton = this.modal.locator('.close-btn, button:has-text("Close")');
    this.uploadProgress = page.locator('#uploadProgress');
    this.uploadSuccess = page.locator('#uploadSuccess');
    this.uploadError = page.locator('#uploadError');
  }

  /**
   * Wait for modal to be visible
   */
  async waitForOpen() {
    await this.modal.waitFor({ state: 'visible', timeout: 3000 });
  }

  /**
   * Check if modal is open
   */
  async isOpen(): Promise<boolean> {
    try {
      return await this.modal.isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Check if modal is hidden
   */
  async isHidden(): Promise<boolean> {
    const isHidden = await this.modal.evaluate(el => el.classList.contains('hidden'));
    return isHidden;
  }

  /**
   * Upload a file (context mode - subject/category pre-selected)
   */
  async uploadFile(filePath: string) {
    await this.fileInput.setInputFiles(filePath);
    await this.uploadButton.click();
  }

  /**
   * Close the modal
   */
  async close() {
    await this.closeButton.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Wait for upload to complete successfully
   */
  async waitForSuccess() {
    try {
      await this.uploadSuccess.waitFor({ state: 'visible', timeout: 10000 });
      return true;
    } catch {
      // Check if modal closed (alternative success indicator)
      const hidden = await this.isHidden();
      return hidden;
    }
  }

  /**
   * Check if upload error is shown
   */
  async hasError(): Promise<boolean> {
    try {
      return await this.uploadError.isVisible({ timeout: 5000 });
    } catch {
      return false;
    }
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string | null> {
    try {
      return await this.uploadError.textContent({ timeout: 2000 });
    } catch {
      return null;
    }
  }

  /**
   * Check if upload progress is visible
   */
  async isProgressVisible(): Promise<boolean> {
    try {
      return await this.uploadProgress.isVisible({ timeout: 3000 });
    } catch {
      return false;
    }
  }

  /**
   * Verify context information is displayed
   */
  async isContextDisplayed(): Promise<boolean> {
    return await this.uploadContext.isVisible();
  }

  /**
   * Get the upload context text (subject and category)
   */
  async getContextText(): Promise<string | null> {
    try {
      return await this.uploadContext.textContent();
    } catch {
      return null;
    }
  }
}
