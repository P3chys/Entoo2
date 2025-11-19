import { Page, Locator } from '@playwright/test';

/**
 * File Tree Component
 * Handles navigation and interaction with the file tree structure
 */
export class FileTreeComponent {
  readonly page: Page;
  readonly treeContainer: Locator;
  readonly subjectRows: Locator;

  constructor(page: Page) {
    this.page = page;
    this.treeContainer = page.locator('#treeView, .file-tree');
    this.subjectRows = page.locator('.subject-row');
  }

  /**
   * Get a subject row by name
   */
  getSubjectRow(subjectName: string): Locator {
    return this.subjectRows.filter({ hasText: subjectName }).first();
  }

  /**
   * Check if subject is expanded
   */
  async isSubjectExpanded(subjectName: string): Promise<boolean> {
    const subjectRow = this.getSubjectRow(subjectName);
    try {
      const expandedIndicator = subjectRow.locator('.expanded');
      return (await expandedIndicator.count()) > 0;
    } catch {
      return false;
    }
  }

  /**
   * Expand a subject to show categories
   */
  async expandSubject(subjectName: string) {
    const isExpanded = await this.isSubjectExpanded(subjectName);

    if (!isExpanded) {
      const subjectRow = this.getSubjectRow(subjectName);
      await subjectRow.click();
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Collapse a subject
   */
  async collapseSubject(subjectName: string) {
    const isExpanded = await this.isSubjectExpanded(subjectName);

    if (isExpanded) {
      const subjectRow = this.getSubjectRow(subjectName);
      await subjectRow.click();
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Select a category tab within an expanded subject
   */
  async selectCategory(subjectName: string, categoryName: string) {
    await this.expandSubject(subjectName);

    const categoryTab = this.page.locator(
      `button:has-text("${categoryName}"), .tab-button:has-text("${categoryName}")`
    ).first();

    await categoryTab.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Get file count for a subject
   */
  async getSubjectFileCount(subjectName: string): Promise<number> {
    const subjectRow = this.getSubjectRow(subjectName);
    const fileCountText = await subjectRow.locator('.file-count, .count').textContent();
    const match = fileCountText?.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  }

  /**
   * Get file count for a specific category
   */
  async getCategoryFileCount(subjectName: string, categoryName: string): Promise<number> {
    await this.selectCategory(subjectName, categoryName);
    return await this.page.locator('.file-item').count();
  }

  /**
   * Get all file names in a category
   */
  async getFileNames(subjectName: string, categoryName: string): Promise<string[]> {
    await this.selectCategory(subjectName, categoryName);

    const fileItems = await this.page.locator('.file-item').all();
    const names: string[] = [];

    for (const file of fileItems) {
      const nameElement = file.locator('.file-name, a');
      const text = await nameElement.textContent();
      if (text) {
        names.push(text.trim());
      }
    }

    return names;
  }

  /**
   * Check if a file exists in a category
   */
  async hasFile(subjectName: string, categoryName: string, fileName: string): Promise<boolean> {
    const files = await this.getFileNames(subjectName, categoryName);
    return files.some(name => name.includes(fileName));
  }

  /**
   * Get all subject names
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
   * Wait for tree to load
   */
  async waitForLoad() {
    await this.subjectRows.first().waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Check if tree is loaded
   */
  async isLoaded(): Promise<boolean> {
    try {
      return await this.treeContainer.isVisible({ timeout: 5000 });
    } catch {
      return false;
    }
  }
}
