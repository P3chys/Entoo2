/**
 * API Helper for E2E Tests
 * Provides utilities for API interactions and data setup
 */

import { Page, APIRequestContext } from '@playwright/test';

/**
 * Rate limit bypass token for tests
 * This matches the RATE_LIMIT_BYPASS_TOKEN in .env
 */
const RATE_LIMIT_BYPASS_TOKEN = 'test-bypass-token-2024';

/**
 * Export the bypass token for use in other test files
 */
export { RATE_LIMIT_BYPASS_TOKEN };

/**
 * Get authentication token from page
 */
export async function getAuthToken(page: Page): Promise<string | null> {
  return await page.evaluate(() => localStorage.getItem('token'));
}

/**
 * Get headers for API requests with rate limit bypass
 */
export function getBypassHeaders(additionalHeaders: Record<string, string> = {}): Record<string, string> {
  return {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-Bypass-Rate-Limit': RATE_LIMIT_BYPASS_TOKEN,
    ...additionalHeaders,
  };
}

/**
 * Make authenticated API request with rate limit bypass
 */
export async function apiRequest(
  request: APIRequestContext,
  page: Page,
  endpoint: string,
  options: any = {}
): Promise<any> {
  const token = await getAuthToken(page);

  const response = await request.fetch(`http://localhost:8000${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Bypass-Rate-Limit': RATE_LIMIT_BYPASS_TOKEN,
      ...options.headers,
    },
  });

  return response;
}

/**
 * Upload test file via API
 */
export async function uploadTestFile(
  request: APIRequestContext,
  page: Page,
  fileName: string,
  fileContent: Buffer,
  metadata: {
    subject_name: string;
    category: string;
  }
): Promise<any> {
  const token = await getAuthToken(page);

  const formData = {
    file: {
      name: fileName,
      mimeType: 'application/pdf',
      buffer: fileContent,
    },
    subject_name: metadata.subject_name,
    category: metadata.category,
  };

  const response = await request.post('http://localhost:8000/api/files', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Bypass-Rate-Limit': RATE_LIMIT_BYPASS_TOKEN,
    },
    multipart: formData,
  });

  return await response.json();
}

/**
 * Delete file via API
 */
export async function deleteFile(
  request: APIRequestContext,
  page: Page,
  fileId: number
): Promise<void> {
  const token = await getAuthToken(page);

  await request.delete(`http://localhost:8000/api/files/${fileId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Bypass-Rate-Limit': RATE_LIMIT_BYPASS_TOKEN,
    },
  });
}

/**
 * Add favorite via API
 */
export async function addFavorite(
  request: APIRequestContext,
  page: Page,
  subjectName: string
): Promise<void> {
  await apiRequest(request, page, '/api/favorites', {
    method: 'POST',
    data: { subject_name: subjectName },
  });
}

/**
 * Remove favorite via API
 */
export async function removeFavorite(
  request: APIRequestContext,
  page: Page,
  favoriteId: number
): Promise<void> {
  await apiRequest(request, page, `/api/favorites/${favoriteId}`, {
    method: 'DELETE',
  });
}

/**
 * Wait for Elasticsearch to be ready
 */
export async function waitForElasticsearch(): Promise<void> {
  const maxRetries = 30;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const response = await fetch('http://localhost:9200/_cluster/health');
      if (response.ok) {
        return;
      }
    } catch (error) {
      // Elasticsearch not ready yet
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
    retries++;
  }

  throw new Error('Elasticsearch did not become ready in time');
}

/**
 * Wait for a subject to be indexed in Elasticsearch and caches to be cleared
 * This is needed because file processing is async (Redis queue)
 */
export async function waitForSubjectToBeIndexed(
  page: Page,
  subjectName: string,
  maxRetries: number = 30
): Promise<void> {
  const token = await getAuthToken(page);

  if (!token) {
    throw new Error('No auth token available');
  }

  let retries = 0;
  while (retries < maxRetries) {
    try {
      // Query the subjects API to see if our subject appears
      // Use X-Bypass-Rate-Limit header to bypass cache (backend recognizes this)
      const response = await fetch(`http://localhost:8000/api/subjects?with_counts=true`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Bypass-Rate-Limit': RATE_LIMIT_BYPASS_TOKEN, // This bypasses cache
          'X-Bypass-Cache': 'true', // Explicit cache bypass
          'Cache-Control': 'no-cache',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const subjects = data.subjects || [];

        // Check if our subject is in the list
        const found = subjects.some((s: any) => s.subject_name === subjectName);

        if (found) {
          // Subject found! Give it extra time to ensure cache is cleared and dashboard can load fresh data
          await new Promise(resolve => setTimeout(resolve, 2000));
          return;
        }
      }
    } catch (error) {
      // Ignore errors and retry
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
    retries++;
  }

  console.warn(`Subject "${subjectName}" not indexed after ${maxRetries} retries (${maxRetries}s)`);
}

/**
 * Clean up test data
 */
export async function cleanupTestData(
  request: APIRequestContext,
  page: Page
): Promise<void> {
  // Get all favorites and remove them
  const favResponse = await apiRequest(request, page, '/api/favorites');
  if (favResponse.ok()) {
    const data = await favResponse.json();
    const favorites = data.favorites || [];

    for (const fav of favorites) {
      await removeFavorite(request, page, fav.id);
    }
  }

  // Get all uploaded files and remove them
  const filesResponse = await apiRequest(request, page, '/api/subjects');
  if (filesResponse.ok()) {
    const subjects = await filesResponse.json();

    for (const subject of subjects) {
      // Try to get files for this subject
      // Note: This is a simplified cleanup, adjust based on your actual API
    }
  }
}

/**
 * Create a test subject with a file upload
 */
export async function createSubject(
  page: Page,
  subjectName: string,
  category: string
): Promise<void> {
  // Subject creation happens implicitly when uploading a file
  // So we'll just create a minimal file for the subject
  await createFile(page, subjectName, category, 'test.pdf');

  // Wait for Elasticsearch indexing and cache refresh
  // File processing is async (Redis queue), so we need to wait
  // for the job to complete and caches to be cleared
  await waitForSubjectToBeIndexed(page, subjectName);
}

/**
 * Create a test file for a subject
 */
export async function createFile(
  page: Page,
  subjectName: string,
  category: string,
  fileName: string
): Promise<void> {
  const token = await getAuthToken(page);

  if (!token) {
    throw new Error('No auth token available');
  }

  // Create a minimal PDF file buffer
  const pdfContent = Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Test PDF) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000214 00000 n\ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n306\n%%EOF'
  );

  const formData = new FormData();
  const blob = new Blob([pdfContent], { type: 'application/pdf' });
  formData.append('file', blob, fileName);
  formData.append('subject_name', subjectName);
  formData.append('category', category);

  const response = await fetch('http://localhost:8000/api/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Bypass-Rate-Limit': RATE_LIMIT_BYPASS_TOKEN,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create file: ${response.statusText} - ${errorText}`);
  }

  // Wait for Elasticsearch indexing and cache refresh
  await waitForSubjectToBeIndexed(page, subjectName);
}

/**
 * Navigate to dashboard and ensure fresh data (bypassing cache)
 */
export async function navigateToDashboardFresh(page: Page): Promise<void> {
  // First, clear the dashboard's internal cache by executing JavaScript in the page context
  await page.evaluate(() => {
    // Clear the subjectFiles cache that stores loaded subject data
    if (typeof window !== 'undefined' && (window as any).subjectFiles) {
      (window as any).subjectFiles = {};
    }
  });

  await page.goto('http://localhost:8000/dashboard');
  await page.waitForLoadState('networkidle');

  // Reload to force fresh data from API (bypass any browser/API cache)
  await page.reload({ waitUntil: 'networkidle' });
}

/**
 * Delete all test subjects matching a prefix
 */
export async function deleteAllTestSubjects(
  page: Page,
  prefix: string
): Promise<void> {
  const token = await getAuthToken(page);

  if (!token) {
    return; // No auth, nothing to delete
  }

  try {
    // Get all files
    const response = await fetch('http://localhost:8000/api/files', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Bypass-Rate-Limit': RATE_LIMIT_BYPASS_TOKEN,
      },
    });

    if (!response.ok) {
      return;
    }

    const data = await response.json();
    const files = data.data || [];

    // Delete files that match the prefix
    for (const file of files) {
      if (file.subject_name && file.subject_name.startsWith(prefix)) {
        await fetch(`http://localhost:8000/api/files/${file.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Bypass-Rate-Limit': RATE_LIMIT_BYPASS_TOKEN,
          },
        });
      }
    }
  } catch (error) {
    // Ignore errors during cleanup
    console.warn('Error during test cleanup:', error);
  }
}

/**
 * Create a test file and return the file data
 * Used for file deletion tests
 */
export async function createTestFile(
  page: Page,
  subjectName: string,
  category: string,
  fileName: string = 'test.pdf'
): Promise<any> {
  const token = await getAuthToken(page);

  if (!token) {
    throw new Error('No auth token available');
  }

  // Create a minimal PDF file buffer
  const pdfContent = Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Test PDF) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000214 00000 n\ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n306\n%%EOF'
  );

  const formData = new FormData();
  const blob = new Blob([pdfContent], { type: 'application/pdf' });
  formData.append('file', blob, fileName);
  formData.append('subject_name', subjectName);
  formData.append('category', category);

  const response = await fetch('http://localhost:8000/api/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Bypass-Rate-Limit': RATE_LIMIT_BYPASS_TOKEN,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create file: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();

  // Wait for Elasticsearch indexing and cache refresh
  await waitForSubjectToBeIndexed(page, subjectName);

  return data;
}

/**
 * Delete a test file
 */
export async function deleteTestFile(
  page: Page,
  fileId: number
): Promise<void> {
  const token = await getAuthToken(page);

  if (!token) {
    throw new Error('No auth token available');
  }

  const response = await fetch(`http://localhost:8000/api/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Bypass-Rate-Limit': RATE_LIMIT_BYPASS_TOKEN,
    },
  });

  if (!response.ok && response.status !== 404) {
    const errorText = await response.text();
    throw new Error(`Failed to delete file: ${response.statusText} - ${errorText}`);
  }
}

/**
 * Get auth headers for API requests
 */
export async function getAuthHeaders(page: Page): Promise<Record<string, string>> {
  const token = await getAuthToken(page);

  if (!token) {
    throw new Error('No auth token available');
  }

  return {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-Bypass-Rate-Limit': RATE_LIMIT_BYPASS_TOKEN,
  };
}

/**
 * Create a test subject with a profile
 */
export async function createTestSubject(
  authToken: string,
  subjectName: string,
  description: string = 'Test subject profile'
): Promise<void> {
  const response = await fetch('http://localhost:8000/api/subject-profiles', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Bypass-Rate-Limit': RATE_LIMIT_BYPASS_TOKEN,
    },
    body: JSON.stringify({
      subject_name: subjectName,
      description: description,
      professor_name: 'Test Professor',
      course_code: 'TEST101',
      semester: 'Winter',
      year: 2024,
      credits: 5,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create test subject: ${response.statusText} - ${errorText}`);
  }
}

/**
 * Create a test comment on a subject
 */
export async function createTestComment(
  authToken: string,
  subjectName: string,
  commentText: string
): Promise<number> {
  const response = await fetch(`http://localhost:8000/api/subjects/${encodeURIComponent(subjectName)}/comments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Bypass-Rate-Limit': RATE_LIMIT_BYPASS_TOKEN,
    },
    body: JSON.stringify({
      comment: commentText,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create test comment: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return data.comment.id;
}

/**
 * Delete a test comment
 */
export async function deleteTestComment(
  authToken: string,
  subjectName: string,
  commentId: number
): Promise<void> {
  const response = await fetch(`http://localhost:8000/api/subjects/${encodeURIComponent(subjectName)}/comments/${commentId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Accept': 'application/json',
      'X-Bypass-Rate-Limit': RATE_LIMIT_BYPASS_TOKEN,
    },
  });

  if (!response.ok && response.status !== 404) {
    const errorText = await response.text();
    throw new Error(`Failed to delete test comment: ${response.statusText} - ${errorText}`);
  }
}
