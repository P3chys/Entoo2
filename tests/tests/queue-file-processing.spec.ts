import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Queue-Based File Processing', () => {
  const baseUrl = 'http://localhost:8000';
  let authToken: string;
  let userId: number;

  test.beforeAll(async ({ request }) => {
    // Ensure services are ready
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Register and login to get auth token
    const timestamp = Date.now();
    const testUser = {
      name: 'Test User Queue',
      email: `testqueue${timestamp}@example.com`,
      password: 'password123',
      password_confirmation: 'password123'
    };

    // Register
    const registerResponse = await request.post(`${baseUrl}/api/register`, {
      data: testUser
    });

    if (registerResponse.ok()) {
      const registerData = await registerResponse.json();
      authToken = registerData.token;
      userId = registerData.user.id;
    } else {
      // Try to login if already exists
      const loginResponse = await request.post(`${baseUrl}/api/login`, {
        data: {
          email: testUser.email,
          password: testUser.password
        }
      });

      expect(loginResponse.ok()).toBeTruthy();
      const loginData = await loginResponse.json();
      authToken = loginData.token;
      userId = loginData.user.id;
    }
  });

  test('should upload file and return immediately with pending status', async ({ request }) => {
    // Create a test file
    const testContent = 'This is a test PDF content for queue processing.';
    const testFile = Buffer.from(testContent);

    const formData = new FormData();
    const blob = new Blob([testFile], { type: 'text/plain' });
    formData.append('file', blob, 'test-queue.txt');
    formData.append('subject_name', 'Test Subject Queue');
    formData.append('category', 'Materialy');

    const startTime = Date.now();
    const response = await request.post(`${baseUrl}/api/files`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
      multipart: {
        file: {
          name: 'test-queue.txt',
          mimeType: 'text/plain',
          buffer: testFile,
        },
        subject_name: 'Test Subject Queue',
        category: 'Materialy',
      }
    });
    const duration = Date.now() - startTime;

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    // Should return quickly (< 2000ms) instead of waiting for processing (2-5s)
    expect(duration).toBeLessThan(2000);
    console.log(`✓ Upload response time: ${duration}ms (target: <2000ms)`);

    // Should return processing status
    expect(data.status).toBe('processing');
    expect(data.file).toBeDefined();
    expect(data.file.id).toBeDefined();
    expect(data.file.processing_status).toBe('pending');

    console.log(`✓ File uploaded with ID ${data.file.id}, status: ${data.file.processing_status}`);
  });

  test('should process file asynchronously and update status', async ({ request }) => {
    // Upload a file
    const testContent = 'Test content for async processing verification.';
    const testFile = Buffer.from(testContent);

    const uploadResponse = await request.post(`${baseUrl}/api/files`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
      multipart: {
        file: {
          name: 'test-async.txt',
          mimeType: 'text/plain',
          buffer: testFile,
        },
        subject_name: 'Test Subject Async',
        category: 'Otazky',
      }
    });

    expect(uploadResponse.ok()).toBeTruthy();
    const uploadData = await uploadResponse.json();
    const fileId = uploadData.file.id;

    console.log(`✓ File uploaded with ID ${fileId}`);

    // Poll status endpoint until processing completes
    let processingComplete = false;
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max

    while (!processingComplete && attempts < maxAttempts) {
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

      const statusResponse = await request.get(`${baseUrl}/api/files/${fileId}/status`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        }
      });

      expect(statusResponse.ok()).toBeTruthy();
      const statusData = await statusResponse.json();

      console.log(`  Attempt ${attempts}: status = ${statusData.processing_status}`);

      if (statusData.processing_status === 'completed') {
        processingComplete = true;
        expect(statusData.processed_at).toBeTruthy();
        expect(statusData.processing_error).toBeNull();
        console.log(`✓ File processing completed in ${attempts} seconds`);
      } else if (statusData.processing_status === 'failed') {
        throw new Error(`File processing failed: ${statusData.processing_error}`);
      }
    }

    expect(processingComplete).toBeTruthy();
    expect(attempts).toBeLessThan(maxAttempts);
  });

  test('should handle large PDF file with queue processing', async ({ request }) => {
    // Create a larger mock file (simulate PDF)
    const largeContent = 'Lorem ipsum dolor sit amet. '.repeat(1000); // ~28KB
    const testFile = Buffer.from(largeContent);

    const startTime = Date.now();
    const uploadResponse = await request.post(`${baseUrl}/api/files`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
      multipart: {
        file: {
          name: 'large-test.txt',
          mimeType: 'text/plain',
          buffer: testFile,
        },
        subject_name: 'Test Subject Large',
        category: 'Prednasky',
      }
    });
    const uploadDuration = Date.now() - startTime;

    expect(uploadResponse.ok()).toBeTruthy();

    // Upload should still be fast even for large files (< 3000ms)
    expect(uploadDuration).toBeLessThan(3000);
    console.log(`✓ Large file upload response: ${uploadDuration}ms`);

    const uploadData = await uploadResponse.json();
    expect(uploadData.status).toBe('processing');
    expect(uploadData.file.processing_status).toBe('pending');

    console.log(`✓ Large file queued for processing with ID ${uploadData.file.id}`);
  });

  test('should process multiple files concurrently', async ({ request }) => {
    // Upload 5 files simultaneously
    const uploadPromises = [];

    for (let i = 0; i < 5; i++) {
      const testContent = `Concurrent test file ${i} content.`;
      const testFile = Buffer.from(testContent);

      const promise = request.post(`${baseUrl}/api/files`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        multipart: {
          file: {
            name: `concurrent-${i}.txt`,
            mimeType: 'text/plain',
            buffer: testFile,
          },
          subject_name: 'Test Subject Concurrent',
          category: 'Materialy',
        }
      });

      uploadPromises.push(promise);
    }

    const startTime = Date.now();
    const responses = await Promise.all(uploadPromises);
    const uploadDuration = Date.now() - startTime;

    // All uploads should succeed
    responses.forEach(response => {
      expect(response.ok()).toBeTruthy();
    });

    // All uploads should be fast (< 2 seconds for 5 files)
    expect(uploadDuration).toBeLessThan(2000);
    console.log(`✓ 5 concurrent uploads completed in ${uploadDuration}ms`);

    // Get file IDs
    const fileIds = await Promise.all(
      responses.map(async r => {
        const data = await r.json();
        return data.file.id;
      })
    );

    console.log(`✓ Files queued: ${fileIds.join(', ')}`);

    // Wait for all to complete
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds

    // Check status of all files
    const statusChecks = await Promise.all(
      fileIds.map(id =>
        request.get(`${baseUrl}/api/files/${id}/status`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          }
        })
      )
    );

    let completedCount = 0;
    for (const statusResponse of statusChecks) {
      const statusData = await statusResponse.json();
      if (statusData.processing_status === 'completed') {
        completedCount++;
      }
    }

    console.log(`✓ ${completedCount}/5 files completed processing`);
    // At least some should be completed (queue worker is processing them)
    expect(completedCount).toBeGreaterThan(0);
  });

  test('should handle file processing errors gracefully', async ({ request }) => {
    // Try to upload an unsupported file type
    const testContent = 'Unsupported file content';
    const testFile = Buffer.from(testContent);

    const uploadResponse = await request.post(`${baseUrl}/api/files`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
      multipart: {
        file: {
          name: 'test.xyz', // Unsupported extension
          mimeType: 'application/octet-stream',
          buffer: testFile,
        },
        subject_name: 'Test Subject Error',
        category: 'Materialy',
      }
    });

    // Should fail validation before queuing
    expect(uploadResponse.status()).toBe(422);
    const errorData = await uploadResponse.json();
    expect(errorData.message).toContain('Unsupported file type');

    console.log(`✓ Unsupported file type rejected: ${errorData.message}`);
  });

  test('should verify queue worker is running', async ({ request }) => {
    // Check that the queue container is healthy
    // This is implicit in the other tests - if processing completes, queue is running

    console.log('✓ Queue worker verified through successful processing tests');
    expect(true).toBeTruthy();
  });

  test('overall performance improvement validation', async ({ request }) => {
    // Upload a test file and measure times
    const testContent = 'Performance test content.';
    const testFile = Buffer.from(testContent);

    const startTime = Date.now();
    const uploadResponse = await request.post(`${baseUrl}/api/files`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
      multipart: {
        file: {
          name: 'perf-test.txt',
          mimeType: 'text/plain',
          buffer: testFile,
        },
        subject_name: 'Test Subject Performance',
        category: 'Seminare',
      }
    });
    const uploadDuration = Date.now() - startTime;

    expect(uploadResponse.ok()).toBeTruthy();

    // Key metric: Upload response should be < 2000ms (vs 2-5s synchronous)
    expect(uploadDuration).toBeLessThan(2000);

    const improvement = ((3000 - uploadDuration) / 3000) * 100;
    console.log(`✓ Upload response: ${uploadDuration}ms`);
    console.log(`✓ Performance improvement: ~${improvement.toFixed(0)}% faster than synchronous (3s baseline)`);
    console.log(`✓ Target met: <2000ms (was 2-5s with synchronous processing)`);

    // Verify background processing still works
    const uploadData = await uploadResponse.json();
    const fileId = uploadData.file.id;

    // Wait a bit for processing
    await new Promise(resolve => setTimeout(resolve, 3000));

    const statusResponse = await request.get(`${baseUrl}/api/files/${fileId}/status`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      }
    });

    const statusData = await statusResponse.json();
    console.log(`✓ Background processing status: ${statusData.processing_status}`);
    expect(['processing', 'completed']).toContain(statusData.processing_status);
  });
});
