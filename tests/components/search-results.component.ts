import { Page, Locator } from '@playwright/test';

/**
 * Search Results Component
 * Handles search results display and interaction
 */
export class SearchResultsComponent {
  readonly page: Page;
  readonly resultsContainer: Locator;
  readonly resultItems: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.resultsContainer = page.locator('#searchResults, .search-results');
    this.resultItems = page.locator('.search-result-item, .result-item');
    this.emptyState = page.locator('.no-results, .empty-state');
  }

  /**
   * Check if results are visible
   */
  async isVisible(): Promise<boolean> {
    try {
      return await this.resultsContainer.isVisible({ timeout: 5000 });
    } catch {
      return false;
    }
  }

  /**
   * Get number of results
   */
  async getResultCount(): Promise<number> {
    try {
      await this.resultsContainer.waitFor({ state: 'visible', timeout: 5000 });
      return await this.resultItems.count();
    } catch {
      return 0;
    }
  }

  /**
   * Check if results are empty
   */
  async isEmpty(): Promise<boolean> {
    const count = await this.getResultCount();
    return count === 0;
  }

  /**
   * Check if empty state is shown
   */
  async hasEmptyState(): Promise<boolean> {
    try {
      return await this.emptyState.isVisible({ timeout: 3000 });
    } catch {
      return false;
    }
  }

  /**
   * Get all result titles/file names
   */
  async getResultTitles(): Promise<string[]> {
    const items = await this.resultItems.all();
    const titles: string[] = [];

    for (const item of items) {
      const titleElement = item.locator('.result-title, .file-name, h3, strong').first();
      const text = await titleElement.textContent();
      if (text) {
        titles.push(text.trim());
      }
    }

    return titles;
  }

  /**
   * Get result at specific index
   */
  getResult(index: number): Locator {
    return this.resultItems.nth(index);
  }

  /**
   * Click on a specific result
   */
  async clickResult(index: number) {
    const result = this.getResult(index);
    await result.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Check if a result contains specific text
   */
  async hasResultWithText(text: string): Promise<boolean> {
    const titles = await this.getResultTitles();
    return titles.some(title => title.toLowerCase().includes(text.toLowerCase()));
  }

  /**
   * Get result by file name
   */
  getResultByFileName(fileName: string): Locator {
    return this.resultItems.filter({ hasText: fileName }).first();
  }

  /**
   * Download file from search results
   */
  async downloadResult(index: number) {
    const result = this.getResult(index);
    const downloadLink = result.locator('a[href*="/files/download"], .download-link');
    await downloadLink.click();
  }

  /**
   * Wait for results to load
   */
  async waitForResults(timeout = 5000) {
    await this.resultsContainer.waitFor({ state: 'visible', timeout });
  }

  /**
   * Check if results contain highlighting (search term highlighting)
   */
  async hasHighlighting(): Promise<boolean> {
    const highlightedElements = this.page.locator('.search-result-item mark, .highlight');
    return (await highlightedElements.count()) > 0;
  }

  /**
   * Get highlighted terms
   */
  async getHighlightedTerms(): Promise<string[]> {
    const highlighted = await this.page.locator('.search-result-item mark, .highlight').all();
    const terms: string[] = [];

    for (const element of highlighted) {
      const text = await element.textContent();
      if (text) {
        terms.push(text.trim());
      }
    }

    return terms;
  }

  /**
   * Get subject names from results
   */
  async getSubjectNames(): Promise<string[]> {
    const items = await this.resultItems.all();
    const subjects: string[] = [];

    for (const item of items) {
      const subjectElement = item.locator('.subject-name, .subject');
      const text = await subjectElement.textContent();
      if (text) {
        subjects.push(text.trim());
      }
    }

    return subjects;
  }
}
