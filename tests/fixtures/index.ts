import { test as base, Page } from '@playwright/test';
import { setupAuth } from '../tests/helpers/auth.helper';
import { DashboardPage } from '../pages/dashboard.page';
import { LoginPage } from '../pages/login.page';
import { RegisterPage } from '../pages/register.page';
import { UploadModalPage } from '../pages/upload-modal.page';
import { FileTreeComponent } from '../components/file-tree.component';
import { AlertComponent } from '../components/alert.component';
import { FavoriteStarComponent } from '../components/favorite-star.component';
import { SearchResultsComponent } from '../components/search-results.component';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Test file interface
 */
export interface TestFile {
  path: string;
  name: string;
  extension: string;
  size: number;
}

/**
 * Extended test fixtures
 */
type CustomFixtures = {
  // Authentication fixtures
  authenticatedPage: Page;

  // Page object fixtures
  loginPage: LoginPage;
  registerPage: RegisterPage;
  dashboardPage: DashboardPage;
  uploadModalPage: UploadModalPage;

  // Component fixtures
  fileTree: FileTreeComponent;
  alerts: AlertComponent;
  favoriteStar: FavoriteStarComponent;
  searchResults: SearchResultsComponent;

  // Test data fixtures
  testFile: TestFile;
  testPdfFile: TestFile;
  testTxtFile: TestFile;
};

/**
 * Extended Playwright test with custom fixtures
 */
export const test = base.extend<CustomFixtures>({
  /**
   * Authenticated page fixture
   * Automatically sets up authentication before tests
   */
  authenticatedPage: async ({ page }, use) => {
    await setupAuth(page);
    await use(page);
  },

  /**
   * Login page fixture
   */
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await use(loginPage);
  },

  /**
   * Register page fixture
   */
  registerPage: async ({ page }, use) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();
    await use(registerPage);
  },

  /**
   * Dashboard page fixture
   * Automatically navigates to dashboard with authentication
   */
  dashboardPage: async ({ authenticatedPage }, use) => {
    const dashboardPage = new DashboardPage(authenticatedPage);
    await dashboardPage.goto();
    await dashboardPage.waitForSubjectsToLoad();
    await use(dashboardPage);
  },

  /**
   * Upload modal page fixture
   */
  uploadModalPage: async ({ authenticatedPage }, use) => {
    const uploadModalPage = new UploadModalPage(authenticatedPage);
    await use(uploadModalPage);
  },

  /**
   * File tree component fixture
   */
  fileTree: async ({ authenticatedPage }, use) => {
    const fileTree = new FileTreeComponent(authenticatedPage);
    await use(fileTree);
  },

  /**
   * Alert component fixture
   */
  alerts: async ({ authenticatedPage }, use) => {
    const alerts = new AlertComponent(authenticatedPage);
    await use(alerts);
  },

  /**
   * Favorite star component fixture
   */
  favoriteStar: async ({ authenticatedPage }, use) => {
    const favoriteStar = new FavoriteStarComponent(authenticatedPage);
    await use(favoriteStar);
  },

  /**
   * Search results component fixture
   */
  searchResults: async ({ authenticatedPage }, use) => {
    const searchResults = new SearchResultsComponent(authenticatedPage);
    await use(searchResults);
  },

  /**
   * Generic test file fixture
   * Creates a temporary test file and cleans it up after test
   */
  testFile: async ({}, use) => {
    const testFilesDir = path.join(__dirname, '../tests/fixtures');

    // Ensure fixtures directory exists
    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true });
    }

    const fileName = `test-${Date.now()}.pdf`;
    const filePath = path.join(testFilesDir, fileName);

    // Create test file
    fs.writeFileSync(filePath, '%PDF-1.4\nTest content');

    const testFile: TestFile = {
      path: filePath,
      name: fileName,
      extension: 'pdf',
      size: fs.statSync(filePath).size
    };

    await use(testFile);

    // Cleanup
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  },

  /**
   * Test PDF file fixture
   */
  testPdfFile: async ({}, use) => {
    const testFilesDir = path.join(__dirname, '../tests/fixtures');

    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true });
    }

    const filePath = path.join(testFilesDir, 'test-document.pdf');

    // Create test PDF if it doesn't exist
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, '%PDF-1.4\nTest PDF content for testing uploads');
    }

    const testFile: TestFile = {
      path: filePath,
      name: 'test-document.pdf',
      extension: 'pdf',
      size: fs.statSync(filePath).size
    };

    await use(testFile);
  },

  /**
   * Test TXT file fixture
   */
  testTxtFile: async ({}, use) => {
    const testFilesDir = path.join(__dirname, '../tests/fixtures');

    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true });
    }

    const filePath = path.join(testFilesDir, 'test-notes.txt');

    // Create test TXT if it doesn't exist
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, 'Test notes content for testing uploads');
    }

    const testFile: TestFile = {
      path: filePath,
      name: 'test-notes.txt',
      extension: 'txt',
      size: fs.statSync(filePath).size
    };

    await use(testFile);
  }
});

export { expect } from '@playwright/test';
