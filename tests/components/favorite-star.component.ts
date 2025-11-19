import { Page, Locator } from '@playwright/test';

/**
 * Favorite Star Component
 * Handles favorite toggle interactions
 */
export class FavoriteStarComponent {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Get favorite star locator for a subject
   */
  getFavoriteStar(subjectName: string): Locator {
    const subjectRow = this.page.locator('.subject-row').filter({ hasText: subjectName }).first();
    return subjectRow.locator('.favorite-star, .star');
  }

  /**
   * Toggle favorite for a subject
   */
  async toggle(subjectName: string) {
    const star = this.getFavoriteStar(subjectName);
    await star.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Check if subject is favorited
   */
  async isFavorited(subjectName: string): Promise<boolean> {
    const star = this.getFavoriteStar(subjectName);
    const classes = await star.getAttribute('class');
    return classes?.includes('favorited') || classes?.includes('active') || false;
  }

  /**
   * Mark subject as favorite (if not already)
   */
  async markAsFavorite(subjectName: string) {
    const isFavorited = await this.isFavorited(subjectName);
    if (!isFavorited) {
      await this.toggle(subjectName);
    }
  }

  /**
   * Remove subject from favorites (if favorited)
   */
  async removeFromFavorites(subjectName: string) {
    const isFavorited = await this.isFavorited(subjectName);
    if (isFavorited) {
      await this.toggle(subjectName);
    }
  }

  /**
   * Get all favorited subject names
   */
  async getAllFavoritedSubjects(): Promise<string[]> {
    const allSubjects = await this.page.locator('.subject-row').all();
    const favoritedSubjects: string[] = [];

    for (const subject of allSubjects) {
      const star = subject.locator('.favorite-star, .star');
      const classes = await star.getAttribute('class');
      const isFavorited = classes?.includes('favorited') || classes?.includes('active') || false;

      if (isFavorited) {
        const nameElement = subject.locator('.subject-name, .name');
        const text = await nameElement.textContent();
        if (text) {
          favoritedSubjects.push(text.trim());
        }
      }
    }

    return favoritedSubjects;
  }

  /**
   * Check if star is visible
   */
  async isVisible(subjectName: string): Promise<boolean> {
    const star = this.getFavoriteStar(subjectName);
    try {
      return await star.isVisible();
    } catch {
      return false;
    }
  }
}
