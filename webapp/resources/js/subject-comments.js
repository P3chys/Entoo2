/**
 * Subject Comments Module
 * Handles displaying, posting, editing, and deleting comments on subject profiles
 */

import { fetchAPI } from './modules/api.js';

/**
 * Render comments section HTML
 * @param {string} subjectName - The subject name
 * @param {Array} comments - Array of comment objects
 * @returns {string} - HTML string for comments section
 */
export function renderCommentsSection(subjectName, comments = []) {
    const token = localStorage.getItem('token');
    const currentUserId = getCurrentUserId();

    return `
        <div class="comments-section">
            <h4 class="comments-title">Comments</h4>

            ${token ? `
                <div class="comment-form" id="comment-form-${escapeAttr(subjectName)}">
                    <textarea
                        id="comment-input-${escapeAttr(subjectName)}"
                        class="comment-textarea"
                        placeholder="Share your thoughts about this subject..."
                        rows="3"
                        maxlength="5000"
                    ></textarea>
                    <div class="comment-form-actions">
                        <button
                            onclick="window.postComment('${escapeAttr(subjectName)}')"
                            class="btn btn-primary btn-small"
                        >
                            Post Comment
                        </button>
                    </div>
                </div>
            ` : `
                <p class="comments-login-message">
                    Please login to post comments
                </p>
            `}

            <div class="comments-list" id="comments-list-${escapeAttr(subjectName)}">
                ${comments.length > 0
                    ? comments.map(comment => renderComment(subjectName, comment, currentUserId)).join('')
                    : '<p class="no-comments">No comments yet. Be the first to comment!</p>'
                }
            </div>
        </div>
    `;
}

/**
 * Render a single comment
 * @param {string} subjectName - The subject name
 * @param {object} comment - Comment object
 * @param {number|null} currentUserId - Current user's ID
 * @returns {string} - HTML string for a comment
 */
function renderComment(subjectName, comment, currentUserId) {
    const isOwner = currentUserId && comment.user_id === currentUserId;
    const formattedDate = formatDate(comment.created_at);
    const userName = comment.user?.name || 'Unknown User';

    return `
        <div class="comment" id="comment-${comment.id}" data-comment-id="${comment.id}">
            <div class="comment-header">
                <span class="comment-author">${escapeHtml(userName)}</span>
                <span class="comment-date">${formattedDate}</span>
            </div>
            <div class="comment-body" id="comment-body-${comment.id}">
                <p class="comment-text">${escapeHtml(comment.comment)}</p>
            </div>
            ${isOwner ? `
                <div class="comment-actions">
                    <button
                        onclick="window.editComment('${escapeAttr(subjectName)}', ${comment.id})"
                        class="btn-link"
                    >
                        Edit
                    </button>
                    <button
                        onclick="window.deleteComment('${escapeAttr(subjectName)}', ${comment.id})"
                        class="btn-link text-danger"
                    >
                        Delete
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Load comments for a subject
 * @param {string} subjectName - The subject name
 * @returns {Promise<Array>} - Array of comments
 */
export async function loadComments(subjectName) {
    try {
        const response = await fetch(`/api/subjects/${encodeURIComponent(subjectName)}/comments`, {
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            throw new Error('Failed to load comments');
        }

        const data = await response.json();
        return data.comments || [];
    } catch (error) {
        console.error('Error loading comments:', error);
        return [];
    }
}

/**
 * Post a new comment
 * @param {string} subjectName - The subject name
 */
window.postComment = async function(subjectName) {
    const textarea = document.getElementById(`comment-input-${escapeAttr(subjectName)}`);
    const commentText = textarea.value.trim();

    if (!commentText) {
        alert('Please enter a comment');
        return;
    }

    try {
        await fetchAPI(`/api/subjects/${encodeURIComponent(subjectName)}/comments`, {
            method: 'POST',
            body: JSON.stringify({ comment: commentText })
        });

        // Clear textarea
        textarea.value = '';

        // Reload comments
        await reloadComments(subjectName);
    } catch (error) {
        alert('Failed to post comment: ' + error.message);
    }
}

/**
 * Edit a comment
 * @param {string} subjectName - The subject name
 * @param {number} commentId - Comment ID
 */
window.editComment = async function(subjectName, commentId) {
    const commentBody = document.getElementById(`comment-body-${commentId}`);
    const currentText = commentBody.querySelector('.comment-text').textContent;

    // Replace comment text with textarea
    commentBody.innerHTML = `
        <textarea
            id="edit-textarea-${commentId}"
            class="comment-textarea"
            rows="3"
            maxlength="5000"
        >${escapeHtml(currentText)}</textarea>
        <div class="comment-form-actions">
            <button
                onclick="window.saveCommentEdit('${escapeAttr(subjectName)}', ${commentId})"
                class="btn btn-primary btn-small"
            >
                Save
            </button>
            <button
                onclick="window.cancelCommentEdit('${escapeAttr(subjectName)}', ${commentId}, '${escapeAttr(currentText)}')"
                class="btn btn-secondary btn-small"
            >
                Cancel
            </button>
        </div>
    `;

    document.getElementById(`edit-textarea-${commentId}`).focus();
}

/**
 * Save comment edit
 * @param {string} subjectName - The subject name
 * @param {number} commentId - Comment ID
 */
window.saveCommentEdit = async function(subjectName, commentId) {
    const textarea = document.getElementById(`edit-textarea-${commentId}`);
    const newText = textarea.value.trim();

    if (!newText) {
        alert('Comment cannot be empty');
        return;
    }

    try {
        await fetchAPI(`/api/subjects/${encodeURIComponent(subjectName)}/comments/${commentId}`, {
            method: 'PUT',
            body: JSON.stringify({ comment: newText })
        });

        // Reload comments to show updated version
        await reloadComments(subjectName);
    } catch (error) {
        alert('Failed to update comment: ' + error.message);
    }
}

/**
 * Cancel comment edit
 * @param {string} subjectName - The subject name
 * @param {number} commentId - Comment ID
 * @param {string} originalText - Original comment text
 */
window.cancelCommentEdit = function(subjectName, commentId, originalText) {
    const commentBody = document.getElementById(`comment-body-${commentId}`);
    commentBody.innerHTML = `<p class="comment-text">${escapeHtml(originalText)}</p>`;
}

/**
 * Delete a comment
 * @param {string} subjectName - The subject name
 * @param {number} commentId - Comment ID
 */
window.deleteComment = async function(subjectName, commentId) {
    if (!confirm('Are you sure you want to delete this comment?')) {
        return;
    }

    try {
        await fetchAPI(`/api/subjects/${encodeURIComponent(subjectName)}/comments/${commentId}`, {
            method: 'DELETE'
        });

        // Reload comments
        await reloadComments(subjectName);
    } catch (error) {
        alert('Failed to delete comment: ' + error.message);
    }
}

/**
 * Reload comments for a subject
 * @param {string} subjectName - The subject name
 */
async function reloadComments(subjectName) {
    const comments = await loadComments(subjectName);
    const commentsList = document.getElementById(`comments-list-${escapeAttr(subjectName)}`);
    const currentUserId = getCurrentUserId();

    if (commentsList) {
        commentsList.innerHTML = comments.length > 0
            ? comments.map(comment => renderComment(subjectName, comment, currentUserId)).join('')
            : '<p class="no-comments">No comments yet. Be the first to comment!</p>';
    }
}

/**
 * Get current user ID from localStorage
 * @returns {number|null} - User ID or null
 */
function getCurrentUserId() {
    try {
        const userStr = localStorage.getItem('user');
        if (!userStr) return null;
        const user = JSON.parse(userStr);
        return user?.id || null;
    } catch {
        return null;
    }
}

/**
 * Format date to readable string
 * @param {string} dateStr - ISO date string
 * @returns {string} - Formatted date
 */
function formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} - Escaped HTML
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

/**
 * Escape attribute value for safe HTML injection
 * @param {string} text - Text to escape
 * @returns {string} - Escaped attribute value
 */
function escapeAttr(text) {
    if (!text) return '';
    return String(text)
        .replace(/[^a-zA-Z0-9]/g, '_');
}
