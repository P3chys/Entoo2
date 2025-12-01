import { test, expect } from '@playwright/test';
import { setupAuth } from '../helpers/auth.helper';
import { createTestSubject, createTestComment } from '../helpers/api.helper';

test.describe('Subject Comments', () => {
  let authToken: string;
  let testSubject: string;

  test.beforeEach(async ({ page }) => {
    authToken = await setupAuth(page);
    testSubject = 'Test Subject ' + Date.now();

    // Create a test subject with profile
    await createTestSubject(authToken, testSubject);

    await page.goto('/dashboard.html');
    await page.waitForLoadState('networkidle');
  });

  test('should display comments section when viewing subject profile', async ({ page }) => {
    // Find and click on the test subject card
    const subjectCard = page.locator('.subject-card', { hasText: testSubject }).first();
    await expect(subjectCard).toBeVisible();

    // Click to view subject profile
    await subjectCard.click();
    await page.waitForTimeout(500);

    // Check if comments section is visible
    const commentsSection = page.locator('.comments-section');
    await expect(commentsSection).toBeVisible();

    const commentsTitle = page.locator('.comments-title');
    await expect(commentsTitle).toContainText('Comments');
  });

  test('should show comment form for authenticated users', async ({ page }) => {
    // View subject profile
    const subjectCard = page.locator('.subject-card', { hasText: testSubject }).first();
    await subjectCard.click();
    await page.waitForTimeout(500);

    // Check if comment form is visible
    const commentForm = page.locator('.comment-form');
    await expect(commentForm).toBeVisible();

    const commentTextarea = page.locator('.comment-textarea');
    await expect(commentTextarea).toBeVisible();
    await expect(commentTextarea).toHaveAttribute('placeholder', /share your thoughts/i);

    const postButton = page.locator('button', { hasText: 'Post Comment' });
    await expect(postButton).toBeVisible();
  });

  test('should post a new comment successfully', async ({ page }) => {
    // View subject profile
    const subjectCard = page.locator('.subject-card', { hasText: testSubject }).first();
    await subjectCard.click();
    await page.waitForTimeout(500);

    const commentText = 'This is a test comment about the subject!';

    // Fill in comment textarea
    const commentTextarea = page.locator('.comment-textarea').first();
    await commentTextarea.fill(commentText);

    // Click post button
    const postButton = page.locator('button', { hasText: 'Post Comment' });
    await postButton.click();

    // Wait for comment to appear in the list
    await page.waitForTimeout(1000);

    // Verify comment is displayed
    const comment = page.locator('.comment').first();
    await expect(comment).toBeVisible();
    await expect(comment).toContainText(commentText);

    // Verify textarea is cleared
    await expect(commentTextarea).toHaveValue('');
  });

  test('should display "no comments" message when no comments exist', async ({ page }) => {
    // View subject profile
    const subjectCard = page.locator('.subject-card', { hasText: testSubject }).first();
    await subjectCard.click();
    await page.waitForTimeout(500);

    // Check for no comments message
    const noCommentsMsg = page.locator('.no-comments');
    await expect(noCommentsMsg).toBeVisible();
    await expect(noCommentsMsg).toContainText(/no comments yet/i);
  });

  test('should display existing comments with author and timestamp', async ({ page }) => {
    // Create a comment via API
    const commentText = 'Pre-existing test comment';
    await createTestComment(authToken, testSubject, commentText);

    // View subject profile
    await page.goto('/dashboard.html');
    await page.waitForLoadState('networkidle');

    const subjectCard = page.locator('.subject-card', { hasText: testSubject }).first();
    await subjectCard.click();
    await page.waitForTimeout(1000);

    // Verify comment is displayed
    const comment = page.locator('.comment').first();
    await expect(comment).toBeVisible();
    await expect(comment).toContainText(commentText);

    // Verify author is displayed
    const commentAuthor = comment.locator('.comment-author');
    await expect(commentAuthor).toBeVisible();

    // Verify timestamp is displayed
    const commentDate = comment.locator('.comment-date');
    await expect(commentDate).toBeVisible();
  });

  test('should allow editing own comment', async ({ page }) => {
    // Create a comment via API
    const originalText = 'Original comment text';
    const commentId = await createTestComment(authToken, testSubject, originalText);

    // View subject profile
    await page.goto('/dashboard.html');
    await page.waitForLoadState('networkidle');

    const subjectCard = page.locator('.subject-card', { hasText: testSubject }).first();
    await subjectCard.click();
    await page.waitForTimeout(1000);

    // Click edit button
    const comment = page.locator('.comment').first();
    const editButton = comment.locator('button', { hasText: 'Edit' });
    await expect(editButton).toBeVisible();
    await editButton.click();

    // Edit textarea should be visible
    const editTextarea = comment.locator('.comment-textarea');
    await expect(editTextarea).toBeVisible();
    await expect(editTextarea).toHaveValue(originalText);

    // Change text
    const updatedText = 'Updated comment text';
    await editTextarea.fill(updatedText);

    // Click save button
    const saveButton = comment.locator('button', { hasText: 'Save' });
    await saveButton.click();

    // Wait for update
    await page.waitForTimeout(1000);

    // Verify updated comment is displayed
    await expect(comment).toContainText(updatedText);
    await expect(comment).not.toContainText(originalText);
  });

  test('should allow canceling comment edit', async ({ page }) => {
    // Create a comment via API
    const originalText = 'Original comment text';
    await createTestComment(authToken, testSubject, originalText);

    // View subject profile
    await page.goto('/dashboard.html');
    await page.waitForLoadState('networkidle');

    const subjectCard = page.locator('.subject-card', { hasText: testSubject }).first();
    await subjectCard.click();
    await page.waitForTimeout(1000);

    // Click edit button
    const comment = page.locator('.comment').first();
    const editButton = comment.locator('button', { hasText: 'Edit' });
    await editButton.click();

    // Change text
    const editTextarea = comment.locator('.comment-textarea');
    await editTextarea.fill('This should be cancelled');

    // Click cancel button
    const cancelButton = comment.locator('button', { hasText: 'Cancel' });
    await cancelButton.click();

    // Verify original text is still displayed
    await expect(comment).toContainText(originalText);
    await expect(comment).not.toContainText('This should be cancelled');
  });

  test('should allow deleting own comment', async ({ page }) => {
    // Create a comment via API
    const commentText = 'Comment to be deleted';
    await createTestComment(authToken, testSubject, commentText);

    // View subject profile
    await page.goto('/dashboard.html');
    await page.waitForLoadState('networkidle');

    const subjectCard = page.locator('.subject-card', { hasText: testSubject }).first();
    await subjectCard.click();
    await page.waitForTimeout(1000);

    // Verify comment exists
    let comment = page.locator('.comment', { hasText: commentText });
    await expect(comment).toBeVisible();

    // Click delete button
    const deleteButton = comment.locator('button', { hasText: 'Delete' });
    await deleteButton.click();

    // Handle confirmation dialog
    page.on('dialog', dialog => dialog.accept());

    // Wait for deletion
    await page.waitForTimeout(1000);

    // Verify comment is removed
    comment = page.locator('.comment', { hasText: commentText });
    await expect(comment).not.toBeVisible();

    // Should show "no comments" message
    const noCommentsMsg = page.locator('.no-comments');
    await expect(noCommentsMsg).toBeVisible();
  });

  test('should not show edit/delete buttons for other users comments', async ({ page }) => {
    // This test would require creating a comment with a different user
    // For now, we'll skip it as it requires multi-user setup
    test.skip();
  });

  test('should validate comment is not empty before posting', async ({ page }) => {
    // View subject profile
    const subjectCard = page.locator('.subject-card', { hasText: testSubject }).first();
    await subjectCard.click();
    await page.waitForTimeout(500);

    // Try to post empty comment
    const postButton = page.locator('button', { hasText: 'Post Comment' });
    await postButton.click();

    // Should show alert
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Please enter a comment');
      await dialog.accept();
    });

    // Comment should not be posted
    const commentsCount = await page.locator('.comment').count();
    expect(commentsCount).toBe(0);
  });

  test('should display comments ordered by timestamp (newest first)', async ({ page }) => {
    // Create multiple comments
    const comment1 = 'First comment';
    const comment2 = 'Second comment';
    const comment3 = 'Third comment';

    await createTestComment(authToken, testSubject, comment1);
    await page.waitForTimeout(100);
    await createTestComment(authToken, testSubject, comment2);
    await page.waitForTimeout(100);
    await createTestComment(authToken, testSubject, comment3);

    // View subject profile
    await page.goto('/dashboard.html');
    await page.waitForLoadState('networkidle');

    const subjectCard = page.locator('.subject-card', { hasText: testSubject }).first();
    await subjectCard.click();
    await page.waitForTimeout(1000);

    // Get all comments
    const comments = page.locator('.comment');
    await expect(comments).toHaveCount(3);

    // Verify order (newest first)
    await expect(comments.nth(0)).toContainText(comment3);
    await expect(comments.nth(1)).toContainText(comment2);
    await expect(comments.nth(2)).toContainText(comment1);
  });

  test('should handle long comment text properly', async ({ page }) => {
    // View subject profile
    const subjectCard = page.locator('.subject-card', { hasText: testSubject }).first();
    await subjectCard.click();
    await page.waitForTimeout(500);

    const longComment = 'A'.repeat(500) + ' This is a very long comment that should be displayed properly without breaking the layout or causing any issues.';

    // Fill in comment textarea
    const commentTextarea = page.locator('.comment-textarea').first();
    await commentTextarea.fill(longComment);

    // Click post button
    const postButton = page.locator('button', { hasText: 'Post Comment' });
    await postButton.click();

    // Wait for comment to appear
    await page.waitForTimeout(1000);

    // Verify comment is displayed with proper text wrapping
    const comment = page.locator('.comment').first();
    await expect(comment).toBeVisible();
    await expect(comment).toContainText(longComment.substring(0, 50));
  });
});
