/**
 * API Helper for E2E Tests
 * Provides utilities for API interactions and data setup
 */

import { Page, APIRequestContext } from '@playwright/test';

/**
 * Get authentication token from page
 */
export async function getAuthToken(page: Page): Promise<string | null> {
  return await page.evaluate(() => localStorage.getItem('token'));
}

/**
 * Make authenticated API request
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
