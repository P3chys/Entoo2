/**
 * Test Data Cleanup Helper
 * Tracks and removes test data created during E2E tests
 */

import { Page, APIRequestContext } from '@playwright/test';
import { getAuthToken, getBypassHeaders } from './api.helper';

/**
 * Registry to track test data created during test runs
 */
export class TestDataRegistry {
  private static uploadedFiles: number[] = [];
  private static createdUsers: string[] = [];
  private static createdSubjects: string[] = [];

  static registerFile(fileId: number) {
    this.uploadedFiles.push(fileId);
  }

  static registerUser(email: string) {
    this.createdUsers.push(email);
  }

  static registerSubject(subjectName: string) {
    this.createdSubjects.push(subjectName);
  }

  static getUploadedFiles() {
    return [...this.uploadedFiles];
  }

  static getCreatedUsers() {
    return [...this.createdUsers];
  }

  static getCreatedSubjects() {
    return [...this.createdSubjects];
  }

  static clear() {
    this.uploadedFiles = [];
    this.createdUsers = [];
    this.createdSubjects = [];
  }
}

/**
 * Delete all files uploaded during tests
 */
export async function cleanupTestFiles(request: APIRequestContext, page: Page): Promise<void> {
  const token = await getAuthToken(page);
  if (!token) return;

  console.log('🧹 Cleaning up test files...');

  try {
    // Get all files
    const response = await request.get('http://localhost:8000/api/files', {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...getBypassHeaders(),
      },
    });

    if (!response.ok()) return;

    const data = await response.json();
    const files = data.data || [];

    // Delete files that match test patterns
    const testPatterns = [
      /^test-/i,           // Starts with "test-"
      /playwright/i,       // Contains "playwright"
      /-test\./i,          // Ends with "-test."
      /^large-file/i,      // Large test files
      /^test\.pdf$/i,      // Generic test files
      /test-delete/i,      // Delete test files
      /test-document/i,    // Test documents
      /test-notes/i,       // Test notes
    ];

    let deletedCount = 0;
    for (const file of files) {
      const fileName = file.original_filename || file.filename || '';
      const isTestFile = testPatterns.some(pattern => pattern.test(fileName));

      if (isTestFile) {
        await request.delete(`http://localhost:8000/api/files/${file.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            ...getBypassHeaders(),
          },
        });
        deletedCount++;
      }
    }

    console.log(`✅ Deleted ${deletedCount} test files`);
  } catch (error) {
    console.warn('⚠️  Error cleaning up test files:', error);
  }
}

/**
 * Delete test users (except the main playwright test user)
 */
export async function cleanupTestUsers(request: APIRequestContext): Promise<void> {
  console.log('🧹 Cleaning up test users...');

  try {
    // This would require admin API endpoint
    // For now, we just track what was created and could be cleaned up
    const testUsers = TestDataRegistry.getCreatedUsers();

    // Filter out the main test user that should persist
    const usersToDelete = testUsers.filter(email =>
      email !== 'playwright-test@entoo.cz'
    );

    console.log(`📋 Test users that could be cleaned: ${usersToDelete.length}`);
    // Actual deletion would require admin endpoint
    // await request.delete(`http://localhost:8000/api/admin/users/${userId}`)
  } catch (error) {
    console.warn('⚠️  Error cleaning up test users:', error);
  }
}

/**
 * Delete test subjects and their files
 */
export async function cleanupTestSubjects(request: APIRequestContext, page: Page): Promise<void> {
  const token = await getAuthToken(page);
  if (!token) return;

  console.log('🧹 Cleaning up test subjects...');

  try {
    const testSubjectPatterns = [
      /^Test Subject/i,
      /^XSS_/i,            // XSS test subjects starting with XSS_
      /^<img src/i,        // XSS test subjects with img tags
      /alert\(/i,          // XSS test subjects with alert
      /<script>/i,         // XSS test subjects with script tags
      /^">/i,              // XSS test subjects starting with ">
      /TestSubject$/i,     // Subjects ending with TestSubject
    ];

    // Get ALL files (not filtered by user) to find subject names
    const filesResponse = await request.get('http://localhost:8000/api/files', {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...getBypassHeaders(),
      },
    });

    if (!filesResponse.ok()) {
      console.warn('Could not fetch files for cleanup');
      return;
    }

    const filesData = await filesResponse.json();
    const allFiles = filesData.data || [];

    console.log(`  Fetched ${allFiles.length} total files from API`);

    // Collect unique test subject names from files
    const testSubjectNamesSet = new Set<string>();
    for (const file of allFiles) {
      const subjectName = file.subject_name || '';
      const isTestSubject = testSubjectPatterns.some(pattern => pattern.test(subjectName));
      if (isTestSubject) {
        testSubjectNamesSet.add(subjectName);
      }
    }

    const testSubjectNames = Array.from(testSubjectNamesSet);

    if (testSubjectNames.length === 0) {
      console.log('  No files with test subject names found');
      console.log('✅ No test subjects found');
      return;
    }

    console.log(`  Found ${testSubjectNames.length} unique test subjects:`);
    testSubjectNames.forEach(name => console.log(`    - "${name.substring(0, 70)}"...`));

    let deletedFileCount = 0;
    let deletedFavorites = 0;
    let deletedProfiles = 0;

    // Now clean up all data for test subjects
    for (const subjectName of testSubjectNames) {
      // 1. Delete subject profile if exists
      try {
        const profileResponse = await request.delete(`http://localhost:8000/api/subject-profiles/${encodeURIComponent(subjectName)}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            ...getBypassHeaders(),
          },
        });
        if (profileResponse.ok()) {
          deletedProfiles++;
        }
      } catch (error) {
        // Profile might not exist, continue
      }

      // 2. Delete favorite if exists
      try {
        const favoritesResponse = await request.get('http://localhost:8000/api/favorites', {
          headers: {
            'Authorization': `Bearer ${token}`,
            ...getBypassHeaders(),
          },
        });

        if (favoritesResponse.ok()) {
          const favoritesData = await favoritesResponse.json();
          const favorites = favoritesData.data || [];

          const favorite = favorites.find((f: any) => f.subject_name === subjectName);
          if (favorite) {
            await request.delete(`http://localhost:8000/api/favorites/${favorite.id}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                ...getBypassHeaders(),
              },
            });
            deletedFavorites++;
          }
        }
      } catch (error) {
        // Favorite might not exist, continue
      }

      // 3. Delete all files for this subject (using already-fetched file list)
      try {
        const subjectFiles = allFiles.filter((f: any) => f.subject_name === subjectName);

        for (const file of subjectFiles) {
          try {
            await request.delete(`http://localhost:8000/api/files/${file.id}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                ...getBypassHeaders(),
              },
            });
            deletedFileCount++;
          } catch (error) {
            // Continue on error
          }
        }
      } catch (error) {
        // Continue on error
      }
    }

    console.log(`✅ Found ${testSubjectNames.length} test subjects`);
    console.log(`   - Deleted ${deletedProfiles} profiles`);
    console.log(`   - Deleted ${deletedFavorites} favorites`);
    console.log(`   - Deleted ${deletedFileCount} files`);

    // Clear cache to refresh subject lists
    if (deletedFileCount > 0) {
      try {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        await execAsync('docker exec php php artisan cache:clear');
        console.log(`   - Cleared Laravel cache`);
      } catch (error) {
        console.warn(`   ⚠️  Could not clear cache: ${error}`);
      }
    }

  } catch (error) {
    console.warn('⚠️  Error cleaning up test subjects:', error);
  }
}

/**
 * Comprehensive cleanup of all test data
 */
export async function cleanupAllTestData(
  request: APIRequestContext,
  page: Page
): Promise<void> {
  console.log('\n🧹 Starting comprehensive test data cleanup...');

  await cleanupTestFiles(request, page);
  await cleanupTestSubjects(request, page);
  await cleanupTestUsers(request);

  // Clear the registry
  TestDataRegistry.clear();

  console.log('✅ Test data cleanup complete\n');
}

/**
 * Cleanup specific to a test file/suite
 */
export async function cleanupTestSuite(
  suiteName: string,
  request: APIRequestContext,
  page: Page
): Promise<void> {
  console.log(`🧹 Cleaning up data for suite: ${suiteName}`);

  const token = await getAuthToken(page);
  if (!token) return;

  // Delete files specific to this suite
  const registeredFiles = TestDataRegistry.getUploadedFiles();

  for (const fileId of registeredFiles) {
    try {
      await request.delete(`http://localhost:8000/api/files/${fileId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          ...getBypassHeaders(),
        },
      });
    } catch (error) {
      // Ignore errors - file might already be deleted
    }
  }

  console.log(`✅ Cleanup complete for suite: ${suiteName}`);
}

/**
 * Clean up temporary files from the test fixtures directory
 */
export async function cleanupFixtureFiles(): Promise<void> {
  console.log('🧹 Cleaning up test fixture files...');

  const fs = await import('fs');
  const path = await import('path');

  const fixturesDir = path.join(__dirname, '../fixtures');

  if (!fs.existsSync(fixturesDir)) {
    return;
  }

  try {
    const files = fs.readdirSync(fixturesDir);

    // Delete temporary test files
    const tempPatterns = [
      /^large-file\./,
      /^test-delete\./,
      /\.tmp$/,
    ];

    let deletedCount = 0;
    for (const file of files) {
      const shouldDelete = tempPatterns.some(pattern => pattern.test(file));

      if (shouldDelete) {
        const filePath = path.join(fixturesDir, file);
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    }

    console.log(`✅ Deleted ${deletedCount} temporary fixture files`);
  } catch (error) {
    console.warn('⚠️  Error cleaning up fixture files:', error);
  }
}

/**
 * Smart cleanup that detects test data by patterns
 */
export async function smartCleanup(
  request: APIRequestContext,
  page: Page,
  options: {
    files?: boolean;
    users?: boolean;
    subjects?: boolean;
    fixtures?: boolean;
  } = {}
): Promise<void> {
  const {
    files = true,
    users = false,
    subjects = true,
    fixtures = true,
  } = options;

  console.log('🤖 Starting smart cleanup...');

  // Clean up subjects FIRST (before deleting files)
  // This ensures we can find and clean up favorites/profiles while subjects still exist
  if (subjects) await cleanupTestSubjects(request, page);
  if (files) await cleanupTestFiles(request, page);
  if (users) await cleanupTestUsers(request);
  if (fixtures) await cleanupFixtureFiles();

  console.log('✅ Smart cleanup complete');
}
