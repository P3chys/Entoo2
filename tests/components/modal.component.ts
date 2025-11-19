import { Page, Locator } from '@playwright/test';

/**
 * Generic Modal Component
 * Handles common modal interactions
 */
export class ModalComponent {
  readonly page: Page;
  readonly modal: Locator;
  readonly closeButton: Locator;
  readonly selector: string;

  constructor(page: Page, selector: string) {
    this.page = page;
    this.selector = selector;
    this.modal = page.locator(selector);
    this.closeButton = this.modal.locator('.close-btn, button:has-text("Close"), .modal-close');
  }

  /**
   * Check if modal is visible
   */
  async isVisible(): Promise<boolean> {
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
    try {
      const classes = await this.modal.getAttribute('class');
      return classes?.includes('hidden') || false;
    } catch {
      return true;
    }
  }

  /**
   * Wait for modal to open
   */
  async waitForOpen() {
    await this.modal.waitFor({ state: 'visible', timeout: 5000 });
  }

  /**
   * Wait for modal to close
   */
  async waitForClose() {
    await this.page.waitForSelector(`${this.selector}.hidden`, { timeout: 5000 });
  }

  /**
   * Close the modal
   */
  async close() {
    if (await this.isVisible()) {
      await this.closeButton.click();
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * Click outside modal to close (if supported)
   */
  async clickOutside() {
    const backdrop = this.page.locator('.modal-backdrop, .overlay');
    if (await backdrop.isVisible()) {
      await backdrop.click({ position: { x: 10, y: 10 } });
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * Press Escape to close modal
   */
  async pressEscape() {
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(300);
  }

  /**
   * Get modal title
   */
  async getTitle(): Promise<string | null> {
    const titleElement = this.modal.locator('h2, h3, .modal-title').first();
    try {
      return await titleElement.textContent();
    } catch {
      return null;
    }
  }

  /**
   * Get modal body content
   */
  async getContent(): Promise<string | null> {
    const contentElement = this.modal.locator('.modal-body, .modal-content');
    try {
      return await contentElement.textContent();
    } catch {
      return null;
    }
  }
}
