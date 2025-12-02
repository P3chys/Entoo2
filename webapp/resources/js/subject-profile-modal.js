/**
 * Subject Profile Modal - JavaScript Module
 * Handles subject profile viewing, editing, saving, and comments
 */

console.log('[DEBUG] subject-profile-modal.js module loaded - VERSION 2025-12-02-00:40');

import { renderSubjectProfile } from './subject-profile-renderer.js';
import { fetchAPI } from './modules/api.js';

// ========================================
// Comments Functionality
// ========================================

/**
 * Load comments for a subject
 */
async function loadComments(subjectName) {
    try {
        const response = await fetch(`/api/subjects/${encodeURIComponent(subjectName)}/comments`, {
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            return [];
        }

        const data = await response.json();
        return data.comments || [];
    } catch (error) {
        console.error('Error loading comments:', error);
        return [];
    }
}

/**
 * Render comments section HTML
 */
function renderCommentsSection(subjectName, comments = []) {
    const token = localStorage.getItem('token');
    const currentUserId = getCurrentUserId();
    const safeSubject = subjectName.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, '&quot;');

    return `
        <div class="comments-section">
            <h4 class="comments-title">Comments</h4>

            ${token ? `
                <div class="comment-form">
                    <textarea
                        id="comment-input-${escapeForId(subjectName)}"
                        class="comment-textarea"
                        placeholder="Share your thoughts about this subject..."
                        rows="3"
                        maxlength="5000"
                    ></textarea>
                    <div class="comment-form-actions">
                        <button
                            onclick="postComment('${safeSubject}')"
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

            <div class="comments-list" id="comments-list-${escapeForId(subjectName)}">
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
 */
function renderComment(subjectName, comment, currentUserId) {
    const isOwner = currentUserId && comment.user_id === currentUserId;
    const formattedDate = formatDate(comment.created_at);
    const userName = comment.user?.name || 'Unknown User';
    const safeSubject = subjectName.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, '&quot;');

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
                        onclick="editComment('${safeSubject}', ${comment.id})"
                        class="btn-link"
                    >
                        Edit
                    </button>
                    <button
                        onclick="deleteComment('${safeSubject}', ${comment.id})"
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
 * Utility functions
 */
function getCurrentUserId() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return null;

        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.sub || payload.user_id || null;
    } catch (error) {
        return null;
    }
}

function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 7) {
            return date.toLocaleDateString();
        } else if (days > 0) {
            return `${days} day${days > 1 ? 's' : ''} ago`;
        } else if (hours > 0) {
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else if (minutes > 0) {
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else {
            return 'Just now';
        }
    } catch (error) {
        return dateString;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

function escapeForId(text) {
    return String(text).replace(/[^a-zA-Z0-9]/g, '_');
}

// ========================================
// Profile Viewing and Editing
// ========================================

/**
 * View subject profile in expandable panel
 */
window.viewSubjectProfile = async function (subjectName, event) {
    if (event && event.stopPropagation) {
        event.stopPropagation();
    }

    // Get the detail panel for this subject
    const panelId = 'detail-' + subjectName.replace(/[^a-zA-Z0-9]/g, '_');
    const detailPanel = document.getElementById(panelId);

    if (!detailPanel) {
        return;
    }

    // Toggle panel visibility
    if (detailPanel.style.display === 'block') {
        detailPanel.style.display = 'none';
        return;
    }

    // Show loading state
    detailPanel.style.display = 'block';
    detailPanel.innerHTML = '<div class="loading" style="padding: 1rem;">Loading profile...</div>';

    try {
        // Try to fetch existing profile - 404 is expected for subjects without profiles
        const response = await fetch(`/api/subject-profiles/${encodeURIComponent(subjectName)}`, {
            headers: {
                'Accept': 'application/json'
            }
        }).then(res => res.ok ? res : null).catch(() => null);

        let profile = null;
        if (response) {
            const data = await response.json();
            profile = data.profile;
        }

        // Display profile info in the panel
        await window.displaySubjectProfileInPanel(detailPanel, subjectName, profile);
    } catch (error) {
        detailPanel.innerHTML = '<p class="error" style="padding: 1rem;">Failed to load profile</p>';
    }
}

/**
 * Display subject profile in the expandable panel
 */
window.displaySubjectProfileInPanel = async function (panel, subjectName, profile) {
    console.log('[DEBUG] displaySubjectProfileInPanel called', { subjectName, hasProfile: !!profile });

    // Use shared renderer with panel-specific styling
    const profileHTML = renderSubjectProfile(subjectName, profile, 'profile-container profile-panel');
    console.log('[DEBUG] profileHTML length:', profileHTML.length);

    // Load comments always
    const comments = await loadComments(subjectName);
    console.log('[DEBUG] comments loaded:', comments.length, 'comments');

    const commentsHTML = renderCommentsSection(subjectName, comments);
    console.log('[DEBUG] commentsHTML length:', commentsHTML.length);

    // Wrap in panel container with border
    panel.innerHTML = `
        <div style="border-top: 1px solid rgba(255, 255, 255, 0.2);">
            ${profileHTML}
            ${commentsHTML}
        </div>
    `;
    console.log('[DEBUG] Panel HTML set, total length:', panel.innerHTML.length);
}

/**
 * Open modal to edit/create profile
 */
window.openProfileEditModal = function (subjectName, profile) {
    const modal = document.getElementById('subjectProfileModal');
    const content = document.getElementById('subjectProfileContent');
    const form = document.getElementById('subjectProfileForm');

    // Show modal with form
    modal.classList.remove('hidden');
    content.classList.add('hidden');
    form.classList.remove('hidden');

    // Populate form
    document.getElementById('profileSubjectName').value = subjectName;
    document.getElementById('profileDescription').value = profile?.description || '';
    document.getElementById('profileProfessor').value = profile?.professor_name || '';
    document.getElementById('profileCourseCode').value = profile?.course_code || '';
    document.getElementById('profileCredits').value = profile?.credits || '';
    document.getElementById('profileSemester').value = profile?.semester || '';
    document.getElementById('profileYear').value = profile?.year || '';
    document.getElementById('profileColor').value = profile?.color || '#667eea';
    document.getElementById('profileNotes').value = profile?.notes || '';
}

/**
 * Save subject profile
 */
window.saveSubjectProfile = async function (event) {
    event.preventDefault();

    const subjectName = document.getElementById('profileSubjectName').value;
    const formData = {
        subject_name: subjectName,
        description: document.getElementById('profileDescription').value,
        professor_name: document.getElementById('profileProfessor').value,
        course_code: document.getElementById('profileCourseCode').value,
        credits: parseInt(document.getElementById('profileCredits').value) || null,
        semester: document.getElementById('profileSemester').value,
        year: parseInt(document.getElementById('profileYear').value) || null,
        color: document.getElementById('profileColor').value,
        notes: document.getElementById('profileNotes').value
    };

    try {
        // First check if profile exists
        const checkResponse = await fetch(`/api/subject-profiles/${encodeURIComponent(subjectName)}`, {
            headers: { 'Accept': 'application/json' }
        });

        const profileExists = checkResponse.ok;

        // Use PUT if exists, POST if new
        const method = profileExists ? 'PUT' : 'POST';
        const url = profileExists
            ? `/api/subject-profiles/${encodeURIComponent(subjectName)}`
            : '/api/subject-profiles';

        // Use fetchAPI from module
        await fetchAPI(url, {
            method: method,
            body: JSON.stringify(formData)
        });

        // Show success message
        alert('Profile saved successfully!');

        // Close modal
        window.closeSubjectProfileModal();

        // Reload the subject in the dashboard to reflect changes
        if (typeof window.reloadSubject === 'function') {
            await window.reloadSubject(subjectName);
        }

        // Always try to refresh the detail panel if it exists
        const panelId = 'detail-' + subjectName.replace(/[^a-zA-Z0-9]/g, '_');
        const detailPanel = document.getElementById(panelId);
        if (detailPanel) {
            // If panel is currently hidden, show it with the new profile
            if (detailPanel.style.display !== 'block') {
                detailPanel.style.display = 'block';
            }

            // Reload the profile data in the panel
            detailPanel.innerHTML = '<div class="loading" style="padding: 1rem;">Loading profile...</div>';

            const profileResponse = await fetch(`/api/subject-profiles/${encodeURIComponent(subjectName)}`, {
                headers: { 'Accept': 'application/json' }
            });

            let profile = null;
            if (profileResponse.ok) {
                const data = await profileResponse.json();
                profile = data.profile;
            }

            window.displaySubjectProfileInPanel(detailPanel, subjectName, profile);
        }
    } catch (error) {
        alert('Failed to save profile: ' + error.message);
    }
}

/**
 * Close subject profile modal
 */
window.closeSubjectProfileModal = function () {
    document.getElementById('subjectProfileModal').classList.add('hidden');
}

// ========================================
// Comment Interaction Functions
// ========================================

/**
 * Post a new comment
 */
window.postComment = async function (subjectName) {
    const textarea = document.getElementById(`comment-input-${escapeForId(subjectName)}`);
    const checkbox = document.getElementById(`comment-anonymous-${escapeForId(subjectName)}`);
    const commentText = textarea.value.trim();
    const isAnonymous = checkbox ? checkbox.checked : false;

    console.log('[DEBUG] postComment - checkbox element:', checkbox);
    console.log('[DEBUG] postComment - isAnonymous:', isAnonymous);

    if (!commentText) {
        alert('Please enter a comment before posting.');
        return;
    }

    try {
        await fetchAPI(`/api/subjects/${encodeURIComponent(subjectName)}/comments`, {
            method: 'POST',
            body: JSON.stringify({
                comment: commentText,
                is_anonymous: isAnonymous
            })
        });

        // Clear textarea and checkbox
        textarea.value = '';
        if (checkbox) {
            checkbox.checked = false;
        }

        // Reload comments
        await reloadComments(subjectName);
    } catch (error) {
        alert('Failed to post comment: ' + error.message);
    }
}

/**
 * Edit a comment
 */
window.editComment = async function (subjectName, commentId) {
    const commentElement = document.getElementById(`comment-${commentId}`);
    const commentBody = document.getElementById(`comment-body-${commentId}`);
    const commentTextElement = commentBody.querySelector('.comment-text');
    const currentText = commentTextElement.textContent;

    // Replace comment body with textarea
    commentBody.innerHTML = `
        <textarea class="comment-textarea" id="edit-textarea-${commentId}" rows="3">${escapeHtml(currentText)}</textarea>
        <div class="comment-form-actions" style="margin-top: 0.5rem;">
            <button onclick="saveCommentEdit('${subjectName.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}', ${commentId})" class="btn btn-primary btn-small">Save</button>
            <button onclick="cancelCommentEdit(${commentId}, '${escapeHtml(currentText).replace(/\\/g, "\\\\").replace(/'/g, "\\'")} ')" class="btn btn-secondary btn-small">Cancel</button>
        </div>
    `;
}

/**
 * Save comment edit
 */
window.saveCommentEdit = async function (subjectName, commentId) {
    const textarea = document.getElementById(`edit-textarea-${commentId}`);
    const newText = textarea.value.trim();

    if (!newText) {
        alert('Comment cannot be empty.');
        return;
    }

    try {
        await fetchAPI(`/api/subjects/${encodeURIComponent(subjectName)}/comments/${commentId}`, {
            method: 'PUT',
            body: JSON.stringify({ comment: newText })
        });

        // Reload comments
        await reloadComments(subjectName);
    } catch (error) {
        alert('Failed to update comment: ' + error.message);
    }
}

/**
 * Cancel comment edit
 */
window.cancelCommentEdit = function (commentId, originalText) {
    const commentBody = document.getElementById(`comment-body-${commentId}`);
    commentBody.innerHTML = `<p class="comment-text">${originalText}</p>`;
}

/**
 * Delete a comment
 */
window.deleteComment = async function (subjectName, commentId) {
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
 */
async function reloadComments(subjectName) {
    const commentsListElement = document.getElementById(`comments-list-${escapeForId(subjectName)}`);

    if (!commentsListElement) {
        return;
    }

    // Show loading state
    commentsListElement.innerHTML = '<p style="padding: 1rem; text-align: center;">Loading comments...</p>';

    try {
        const comments = await loadComments(subjectName);
        const currentUserId = getCurrentUserId();

        commentsListElement.innerHTML = comments.length > 0
            ? comments.map(comment => renderComment(subjectName, comment, currentUserId)).join('')
            : '<p class="no-comments">No comments yet. Be the first to comment!</p>';
    } catch (error) {
        commentsListElement.innerHTML = '<p class="error">Failed to load comments</p>';
    }
}
