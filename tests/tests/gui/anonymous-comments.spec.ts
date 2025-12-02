import { test, expect, Page, Browser } from '@playwright/test';
import { setupAuth } from '../helpers/auth.helper';
import { createTestSubject, RATE_LIMIT_BYPASS_TOKEN } from '../helpers/api.helper';

/**
 * Helper function to register and login a new user
 */
async function registerAndLoginUser(page: Page, userSuffix: string): Promise<{ email: string; name: string }> {
  const timestamp = Date.now();
  const email = `testuser_${userSuffix}_${timestamp}@example.com`;
  const name = `Test User ${userSuffix}`;
  const password = 'testpassword123';

  await page.goto('http://localhost:8000/register');
  await page.fill('input[name="name"]', name);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.fill('input[name="password_confirmation"]', password);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');

  return { email, name };
}

/**
 * Helper function to login existing user
 */
async function loginUser(page: Page, email: string): Promise<void> {
  const password = 'testpassword123';
  await page.goto('http://localhost:8000/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
}

test.describe('Anonymous Comments', () => {
  test('should show anonymous checkbox when posting a comment', async ({ page }) => {
    // Register and login
    await registerAndLoginUser(page, 'anon1');

    // Create test subject
    const authToken = await page.evaluate(() => localStorage.getItem('token')) || '';
    const testSubject = 'Test Subject ' + Date.now();
    await createTestSubject(authToken, testSubject);

    // Navigate to dashboard and open subject
    await page.goto('http://localhost:8000/dashboard');
    await page.waitForLoadState('networkidle');

    const subjectCard = page.locator('.subject-card', { hasText: testSubject }).first();
    await expect(subjectCard).toBeVisible({ timeout: 10000 });
    await subjectCard.click();
    await page.waitForTimeout(500);

    // Verify anonymous checkbox exists
    const anonymousCheckbox = page.locator('input[type="checkbox"][id^="comment-anonymous-"]');
    await expect(anonymousCheckbox).toBeVisible();

    const checkboxLabel = page.locator('label', { hasText: 'Post anonymously' });
    await expect(checkboxLabel).toBeVisible();
  });

  test('should post anonymous comment showing "Anonymous User (You)" for owner', async ({ page }) => {
    // Register and login
    const user = await registerAndLoginUser(page, 'anon2');

    // Create test subject
    const authToken = await page.evaluate(() => localStorage.getItem('token')) || '';
    const testSubject = 'Test Subject ' + Date.now();
    await createTestSubject(authToken, testSubject);

    // Navigate to dashboard and open subject
    await page.goto('http://localhost:8000/dashboard');
    await page.waitForLoadState('networkidle');

    const subjectCard = page.locator('.subject-card', { hasText: testSubject }).first();
    await subjectCard.click();
    await page.waitForTimeout(500);

    // Post anonymous comment
    const commentText = 'This is an anonymous test comment ' + Date.now();
    const commentTextarea = page.locator('.comment-textarea').first();
    await commentTextarea.fill(commentText);

    const anonymousCheckbox = page.locator('input[type="checkbox"][id^="comment-anonymous-"]');
    await anonymousCheckbox.check();

    const postButton = page.locator('button', { hasText: 'Post Comment' });
    await postButton.click();
    await page.waitForTimeout(1000);

    // Verify comment appears with "Anonymous User (You)" for the author
    const comment = page.locator('.comment', { hasText: commentText }).first();
    await expect(comment).toBeVisible();

    const commentAuthor = comment.locator('.comment-author');
    await expect(commentAuthor).toContainText('Anonymous User (You)');
    await expect(commentAuthor).not.toContainText(user.name);
  });

  test('should hide author identity from other users for anonymous comments', async ({ page, browser }) => {
    // User 1 registers and creates anonymous comment
    const user1 = await registerAndLoginUser(page, 'anon3a');
    const authToken1 = await page.evaluate(() => localStorage.getItem('token')) || '';
    const testSubject = 'Test Subject ' + Date.now();
    await createTestSubject(authToken1, testSubject);

    await page.goto('http://localhost:8000/dashboard');
    await page.waitForLoadState('networkidle');

    const subjectCard = page.locator('.subject-card', { hasText: testSubject }).first();
    await subjectCard.click();
    await page.waitForTimeout(500);

    // Post anonymous comment as user 1
    const commentText = 'Anonymous comment from user 1 ' + Date.now();
    const commentTextarea = page.locator('.comment-textarea').first();
    await commentTextarea.fill(commentText);

    const anonymousCheckbox = page.locator('input[type="checkbox"][id^="comment-anonymous-"]');
    await anonymousCheckbox.check();

    const postButton = page.locator('button', { hasText: 'Post Comment' });
    await postButton.click();
    await page.waitForTimeout(1000);

    // Verify user 1 sees "Anonymous User (You)"
    let comment = page.locator('.comment', { hasText: commentText }).first();
    await expect(comment).toBeVisible();
    let commentAuthor = comment.locator('.comment-author');
    await expect(commentAuthor).toContainText('Anonymous User (You)');

    // Now create a second user in a new context
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    const user2 = await registerAndLoginUser(page2, 'anon3b');

    // User 2 views the same subject
    await page2.goto('http://localhost:8000/dashboard');
    await page2.waitForLoadState('networkidle');

    const subjectCard2 = page2.locator('.subject-card', { hasText: testSubject }).first();
    await expect(subjectCard2).toBeVisible({ timeout: 10000 });
    await subjectCard2.click();
    await page2.waitForTimeout(500);

    // Verify user 2 sees "Anonymous User" WITHOUT "(You)"
    const comment2 = page2.locator('.comment', { hasText: commentText }).first();
    await expect(comment2).toBeVisible();

    const commentAuthor2 = comment2.locator('.comment-author');
    await expect(commentAuthor2).toContainText('Anonymous User');
    await expect(commentAuthor2).not.toContainText('(You)');

    // Most importantly: verify user 2 cannot see user 1's real name
    await expect(commentAuthor2).not.toContainText(user1.name);

    await page2.close();
    await context2.close();
  });

  test('should show author name to everyone for non-anonymous comments', async ({ page, browser }) => {
    // User 1 posts a non-anonymous comment
    const user1 = await registerAndLoginUser(page, 'anon4a');
    const authToken1 = await page.evaluate(() => localStorage.getItem('token')) || '';
    const testSubject = 'Test Subject ' + Date.now();
    await createTestSubject(authToken1, testSubject);

    await page.goto('http://localhost:8000/dashboard');
    await page.waitForLoadState('networkidle');

    const subjectCard = page.locator('.subject-card', { hasText: testSubject }).first();
    await subjectCard.click();
    await page.waitForTimeout(500);

    // Post non-anonymous comment (checkbox unchecked)
    const commentText = 'Public comment from user 1 ' + Date.now();
    const commentTextarea = page.locator('.comment-textarea').first();
    await commentTextarea.fill(commentText);

    // Ensure checkbox is NOT checked
    const anonymousCheckbox = page.locator('input[type="checkbox"][id^="comment-anonymous-"]');
    if (await anonymousCheckbox.isChecked()) {
      await anonymousCheckbox.uncheck();
    }

    const postButton = page.locator('button', { hasText: 'Post Comment' });
    await postButton.click();
    await page.waitForTimeout(1000);

    // Verify comment shows real author name for user 1
    let comment = page.locator('.comment', { hasText: commentText }).first();
    await expect(comment).toBeVisible();

    let commentAuthor = comment.locator('.comment-author');
    await expect(commentAuthor).toContainText(user1.name);
    await expect(commentAuthor).not.toContainText('Anonymous');

    // User 2 views the comment
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    await registerAndLoginUser(page2, 'anon4b');

    await page2.goto('http://localhost:8000/dashboard');
    await page2.waitForLoadState('networkidle');

    const subjectCard2 = page2.locator('.subject-card', { hasText: testSubject }).first();
    await expect(subjectCard2).toBeVisible({ timeout: 10000 });
    await subjectCard2.click();
    await page2.waitForTimeout(500);

    // Verify user 2 also sees the real author name
    const comment2 = page2.locator('.comment', { hasText: commentText }).first();
    await expect(comment2).toBeVisible();

    const commentAuthor2 = comment2.locator('.comment-author');
    await expect(commentAuthor2).toContainText(user1.name);
    await expect(commentAuthor2).not.toContainText('Anonymous');

    await page2.close();
    await context2.close();
  });

  test('should verify backend API hides user data correctly', async ({ page, request }) => {
    // Register user and create subject
    const user = await registerAndLoginUser(page, 'anon5');
    const authToken = await page.evaluate(() => localStorage.getItem('token')) || '';
    const testSubject = 'Test Subject ' + Date.now();
    await createTestSubject(authToken, testSubject);

    // Create an anonymous comment via API
    const commentText = 'API anonymous comment ' + Date.now();
    const response = await request.post(
      `http://localhost:8000/api/subjects/${encodeURIComponent(testSubject)}/comments`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Bypass-Rate-Limit': RATE_LIMIT_BYPASS_TOKEN,
        },
        data: {
          comment: commentText,
          is_anonymous: true,
        },
      }
    );

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    // Verify API response for the owner (user data should be present)
    expect(data.comment.is_anonymous).toBe(true);
    expect(data.comment.user).toBeTruthy(); // Owner can see their own data

    // Now fetch comments as authenticated user (the owner)
    const ownerResponse = await request.get(
      `http://localhost:8000/api/subjects/${encodeURIComponent(testSubject)}/comments`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Accept': 'application/json',
          'X-Bypass-Rate-Limit': RATE_LIMIT_BYPASS_TOKEN,
        },
      }
    );

    expect(ownerResponse.ok()).toBeTruthy();
    const ownerData = await ownerResponse.json();
    const ownerComment = ownerData.comments.find((c: any) => c.comment === commentText);
    expect(ownerComment).toBeTruthy();
    expect(ownerComment.is_anonymous).toBe(true);
    expect(ownerComment.user).toBeTruthy(); // Owner should see their own user data

    // Fetch comments without auth (public view)
    const publicResponse = await request.get(
      `http://localhost:8000/api/subjects/${encodeURIComponent(testSubject)}/comments`,
      {
        headers: {
          'Accept': 'application/json',
          'X-Bypass-Rate-Limit': RATE_LIMIT_BYPASS_TOKEN,
        },
      }
    );

    expect(publicResponse.ok()).toBeTruthy();
    const publicData = await publicResponse.json();

    const publicComment = publicData.comments.find((c: any) => c.comment === commentText);
    expect(publicComment).toBeTruthy();
    expect(publicComment.is_anonymous).toBe(true);
    expect(publicComment.user).toBeNull(); // Identity should be hidden for non-owner
  });
});
