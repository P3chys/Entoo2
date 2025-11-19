import { Page, Locator } from '@playwright/test';

/**
 * Page Object for Dashboard Page
 * Encapsulates all interactions with the main dashboard
 */
export class DashboardPage {
  readonly page: Page;
  readonly fileTree: Locator;
  readonly subjectRows: Locator;
  readonly searchInput: Locator;
  readonly searchResults: Locator;
  readonly uploadBtnCategory: Locator;
  readonly logoutButton: Locator;
  readonly themeToggle: Locator;

  constructor(page: Page) {
    this.page = page;
    this.fileTree = page.locator('#treeView, .file-tree');
    this.subjectRows = page.locator('.subject-row');
    this.searchInput = page.locator('#searchInput, input[placeholder*="Search"]');
    this.searchResults = page.locator('#searchResults, .search-results');
    this.uploadBtnCategory = page.locator('.upload-btn-category');
    this.logoutButton = page.locator('#logoutBtn, button:has-text("Logout")');
    this.themeToggle = page.locator('#themeToggle');
  }

  /**
   * Navigate to the dashboard
   */
  async goto() {
    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wait for subjects to load
   */
  async waitForSubjectsToLoad() {
    await this.subjectRows.first().waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Get a subject row by name
   */
  getSubjectRow(subjectName: string): Locator {
    return this.subjectRows.filter({ hasText: subjectName }).first();
  }

  /**
   * Expand a subject to show categories
   */
  async expandSubject(subjectName: string) {
    const subjectRow = this.getSubjectRow(subjectName);
    await subjectRow.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Select a category tab within an expanded subject
   */
  async selectCategory(categoryName: string) {
    const categoryTab = this.page.locator(`button:has-text("${categoryName}"), .tab-button:has-text("${categoryName}")`).first();
    await categoryTab.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Get file count from subject row
   */
  async getSubjectFileCount(subjectName: string): Promise<number> {
    const subjectRow = this.getSubjectRow(subjectName);
    const fileCountText = await subjectRow.locator('.file-count, .count').textContent();
    const match = fileCountText?.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  }

  /**
   * Toggle favorite star for a subject
   */
  async toggleFavorite(subjectName: string) {
    const subjectRow = this.getSubjectRow(subjectName);
    const favoriteStar = subjectRow.locator('.favorite-star, .star');
    await favoriteStar.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Check if subject is favorited
   */
  async isSubjectFavorite(subjectName: string): Promise<boolean> {
    const subjectRow = this.getSubjectRow(subjectName);
    const favoriteStar = subjectRow.locator('.favorite-star, .star');
    const classes = await favoriteStar.getAttribute('class');
    return classes?.includes('favorited') || classes?.includes('active') || false;
  }

  /**
   * Perform search
   */
  async search(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
    await this.page.waitForTimeout(500);
  }

  /**
   * Get search results count
   */
  async getSearchResultsCount(): Promise<number> {
    await this.searchResults.waitFor({ state: 'visible', timeout: 5000 });
    return await this.page.locator('.search-result-item, .result-item').count();
  }

  /**
   * Clear search
   */
  async clearSearch() {
    await this.searchInput.clear();
    await this.page.waitForTimeout(300);
  }

  /**
   * Open upload modal (context mode)
   */
  async openUploadModal() {
    await this.uploadBtnCategory.first().waitFor({ state: 'visible', timeout: 10000 });
    await this.uploadBtnCategory.first().click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Logout from dashboard
   */
  async logout() {
    await this.logoutButton.click();
    await this.page.waitForURL(/\/login/, { timeout: 5000 });
  }

  /**
   * Toggle theme (light/dark)
   */
  async toggleTheme() {
    await this.themeToggle.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Get list of all subject names
   */
  async getAllSubjectNames(): Promise<string[]> {
    const subjects = await this.subjectRows.all();
    const names: string[] = [];

    for (const subject of subjects) {
      const nameElement = subject.locator('.subject-name, .name');
      const text = await nameElement.textContent();
      if (text) {
        names.push(text.trim());
      }
    }

    return names;
  }

  /**
   * Check if dashboard is loaded
   */
  async isDashboardLoaded(): Promise<boolean> {
    try {
      await this.page.waitForSelector('.dashboard-container, .file-tree', {
        state: 'visible',
        timeout: 5000
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get first subject with files
   */
  async getFirstSubjectWithFiles(): Promise<string | null> {
    const subjects = await this.subjectRows.all();

    for (const subject of subjects) {
      const fileCountText = await subject.locator('.file-count, .count').textContent();
      const fileCount = fileCountText ? parseInt(fileCountText.match(/\d+/)?.[0] || '0') : 0;

      if (fileCount > 0) {
        const nameElement = subject.locator('.subject-name, .name');
        const text = await nameElement.textContent();
        return text?.trim() || null;
      }
    }

    return null;
  }

  /**
   * Download first file in a subject/category
   */
  async downloadFirstFile(): Promise<void> {
    const downloadLink = this.page.locator('.file-item a, .file-download, a[href*="/files/download"]').first();
    await downloadLink.click();
  }

  /**
   * Delete first file in current view
   */
  async deleteFirstFile() {
    const deleteBtn = this.page.locator('.delete-file, .file-delete, button:has-text("Delete"), .delete-btn').first();

    // Accept confirmation dialog if it appears
    this.page.on('dialog', dialog => dialog.accept());

    await deleteBtn.click();
    await this.page.waitForTimeout(2000);
  }
}
