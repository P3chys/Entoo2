import { Page } from '@playwright/test';

/**
 * Wait Utilities
 * Helper functions for waiting in tests
 */
export class WaitUtils {
  /**
   * Wait for an element to be visible
   */
  static async forElement(page: Page, selector: string, timeout = 5000) {
    await page.waitForSelector(selector, { state: 'visible', timeout });
  }

  /**
   * Wait for an element to disappear
   */
  static async forElementToDisappear(page: Page, selector: string, timeout = 5000) {
    await page.waitForSelector(selector, { state: 'hidden', timeout });
  }

  /**
   * Wait for DOM to be stable (no network activity)
   */
  static async forStableDOM(page: Page) {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);
  }

  /**
   * Wait for API response matching pattern
   */
  static async forApiResponse(page: Page, urlPattern: string | RegExp, timeout = 10000) {
    return await page.waitForResponse(urlPattern, { timeout });
  }

  /**
   * Wait for navigation to complete
   */
  static async forNavigation(page: Page, urlPattern?: string | RegExp) {
    if (urlPattern) {
      await page.waitForURL(urlPattern, { timeout: 10000 });
    } else {
      await page.waitForLoadState('domcontentloaded');
    }
  }

  /**
   * Wait for page to be fully loaded
   */
  static async forPageLoad(page: Page) {
    await page.waitForLoadState('load');
    await page.waitForLoadState('networkidle');
  }

  /**
   * Wait for specific condition to be true
   */
  static async forCondition(
    condition: () => Promise<boolean>,
    options: { timeout?: number; interval?: number } = {}
  ): Promise<void> {
    const { timeout = 5000, interval = 100 } = options;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error(`Condition not met within ${timeout}ms`);
  }

  /**
   * Wait for element count to match expected
   */
  static async forElementCount(
    page: Page,
    selector: string,
    expectedCount: number,
    timeout = 5000
  ) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const count = await page.locator(selector).count();
      if (count === expectedCount) {
        return;
      }
      await page.waitForTimeout(100);
    }

    throw new Error(`Element count for "${selector}" did not reach ${expectedCount} within ${timeout}ms`);
  }

  /**
   * Wait for text to appear on page
   */
  static async forText(page: Page, text: string, timeout = 5000) {
    await page.waitForSelector(`text=${text}`, { timeout });
  }

  /**
   * Wait for animation to complete
   */
  static async forAnimation(page: Page, duration = 500) {
    await page.waitForTimeout(duration);
  }

  /**
   * Wait with custom delay
   */
  static async delay(ms: number) {
    await new Promise(resolve => setTimeout(resolve, ms));
  }
}
