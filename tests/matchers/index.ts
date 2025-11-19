import { expect as baseExpect, Locator, Page } from '@playwright/test';
import { FileTreeComponent } from '../components/file-tree.component';

/**
 * Custom matcher return type
 */
interface MatcherResult {
  pass: boolean;
  message: () => string;
}

/**
 * Extended matchers for Playwright
 */
const customMatchers = {
  /**
   * Check if element is marked as favorite
   */
  async toBeMarkedAsFavorite(locator: Locator): Promise<MatcherResult> {
    const classes = await locator.getAttribute('class');
    const pass = classes?.includes('favorited') || classes?.includes('active') || false;

    return {
      pass,
      message: () =>
        pass
          ? 'Expected element not to be marked as favorite'
          : 'Expected element to be marked as favorite'
    };
  },

  /**
   * Check if upload was successful
   */
  async toShowUploadSuccess(page: Page): Promise<MatcherResult> {
    const successAlert = page.locator('.alert-success, .success-message, #uploadSuccess');
    const success = await successAlert.isVisible({ timeout: 5000 }).catch(() => false);

    // Alternative: check if modal closed
    const modalHidden = await page
      .locator('#uploadModal')
      .evaluate((el) => el.classList.contains('hidden'))
      .catch(() => false);

    const pass = success || modalHidden;

    return {
      pass,
      message: () =>
        pass ? 'Expected upload not to succeed' : 'Expected upload to succeed'
    };
  },

  /**
   * Check if upload failed with error
   */
  async toShowUploadError(page: Page): Promise<MatcherResult> {
    const errorAlert = page.locator('.alert-error, .alert-danger, #uploadError');
    const pass = await errorAlert.isVisible({ timeout: 5000 }).catch(() => false);

    return {
      pass,
      message: () =>
        pass ? 'Expected upload not to show error' : 'Expected upload to show error'
    };
  },

  /**
   * Check if page has specific number of search results
   */
  async toHaveSearchResults(page: Page, count: number): Promise<MatcherResult> {
    const results = await page.locator('.search-result-item, .result-item').count();
    const pass = results === count;

    return {
      pass,
      message: () =>
        pass
          ? `Expected not to have ${count} search results`
          : `Expected ${count} search results, but got ${results}`
    };
  },

  /**
   * Check if page has at least minimum number of search results
   */
  async toHaveAtLeastSearchResults(page: Page, minCount: number): Promise<MatcherResult> {
    const results = await page.locator('.search-result-item, .result-item').count();
    const pass = results >= minCount;

    return {
      pass,
      message: () =>
        pass
          ? `Expected to have fewer than ${minCount} search results`
          : `Expected at least ${minCount} search results, but got ${results}`
    };
  },

  /**
   * Check if subject has specific number of files in category
   */
  async toHaveFilesInCategory(
    page: Page,
    subjectName: string,
    categoryName: string,
    count: number
  ): Promise<MatcherResult> {
    const fileTree = new FileTreeComponent(page);
    const actualCount = await fileTree.getCategoryFileCount(subjectName, categoryName);
    const pass = actualCount === count;

    return {
      pass,
      message: () =>
        pass
          ? `Expected ${subjectName}/${categoryName} not to have ${count} files`
          : `Expected ${subjectName}/${categoryName} to have ${count} files, but got ${actualCount}`
    };
  },

  /**
   * Check if dashboard is loaded and visible
   */
  async toShowDashboard(page: Page): Promise<MatcherResult> {
    const dashboard = page.locator('.dashboard-container, .file-tree');
    const pass = await dashboard.first().isVisible({ timeout: 5000 }).catch(() => false);

    return {
      pass,
      message: () =>
        pass ? 'Expected dashboard not to be visible' : 'Expected dashboard to be visible'
    };
  },

  /**
   * Check if user is authenticated
   */
  async toBeAuthenticated(page: Page): Promise<MatcherResult> {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const pass = !!token;

    return {
      pass,
      message: () =>
        pass ? 'Expected user not to be authenticated' : 'Expected user to be authenticated'
    };
  },

  /**
   * Check if modal is visible
   */
  async toShowModal(page: Page, modalSelector: string): Promise<MatcherResult> {
    const modal = page.locator(modalSelector);
    const isVisible = await modal.isVisible().catch(() => false);
    const isHidden = await modal.evaluate(el => el.classList.contains('hidden')).catch(() => true);
    const pass = isVisible && !isHidden;

    return {
      pass,
      message: () =>
        pass ? `Expected modal ${modalSelector} not to be visible` : `Expected modal ${modalSelector} to be visible`
    };
  },

  /**
   * Check if error message is displayed
   */
  async toShowError(page: Page, errorText?: string): Promise<MatcherResult> {
    const errorElements = page.locator('.error, .alert-danger, .alert-error, .text-red-500');
    const isVisible = await errorElements.first().isVisible({ timeout: 3000 }).catch(() => false);

    if (!isVisible) {
      return {
        pass: false,
        message: () => 'Expected error message to be displayed'
      };
    }

    if (errorText) {
      const text = await errorElements.first().textContent();
      const pass = text?.includes(errorText) || false;

      return {
        pass,
        message: () =>
          pass
            ? `Expected error not to contain "${errorText}"`
            : `Expected error to contain "${errorText}", but got "${text}"`
      };
    }

    return {
      pass: true,
      message: () => 'Expected error message not to be displayed'
    };
  },

  /**
   * Check if success message is displayed
   */
  async toShowSuccess(page: Page, successText?: string): Promise<MatcherResult> {
    const successElements = page.locator('.alert-success, .success-message');
    const isVisible = await successElements.first().isVisible({ timeout: 3000 }).catch(() => false);

    if (!isVisible) {
      return {
        pass: false,
        message: () => 'Expected success message to be displayed'
      };
    }

    if (successText) {
      const text = await successElements.first().textContent();
      const pass = text?.includes(successText) || false;

      return {
        pass,
        message: () =>
          pass
            ? `Expected success not to contain "${successText}"`
            : `Expected success to contain "${successText}", but got "${text}"`
      };
    }

    return {
      pass: true,
      message: () => 'Expected success message not to be displayed'
    };
  },

  /**
   * Check if file tree has loaded
   */
  async toHaveLoadedFileTree(page: Page): Promise<MatcherResult> {
    const fileTree = new FileTreeComponent(page);
    const pass = await fileTree.isLoaded();

    return {
      pass,
      message: () =>
        pass ? 'Expected file tree not to be loaded' : 'Expected file tree to be loaded'
    };
  },

  /**
   * Check if subject exists in tree
   */
  async toHaveSubject(page: Page, subjectName: string): Promise<MatcherResult> {
    const fileTree = new FileTreeComponent(page);
    const subjects = await fileTree.getAllSubjectNames();
    const pass = subjects.some(name => name.includes(subjectName));

    return {
      pass,
      message: () =>
        pass
          ? `Expected not to find subject "${subjectName}"`
          : `Expected to find subject "${subjectName}" in tree`
    };
  },

  /**
   * Check if element has specific CSS class
   */
  async toHaveClass(locator: Locator, className: string): Promise<MatcherResult> {
    const classes = await locator.getAttribute('class');
    const pass = classes?.includes(className) || false;

    return {
      pass,
      message: () =>
        pass
          ? `Expected element not to have class "${className}"`
          : `Expected element to have class "${className}", but got "${classes}"`
    };
  }
};

/**
 * Extend Playwright expect with custom matchers
 */
export const expect = baseExpect.extend(customMatchers);
