/**
 * Subject Profile Renderer - Shared Utility Module
 * Provides consistent subject profile rendering across the application
 */

/**
 * Render subject profile HTML
 * @param {string} subjectName - The subject name
 * @param {object|null} profile - Profile data or null
 * @param {string} containerClass - CSS class for the container (default: 'profile-container')
 * @returns {string} - HTML string for the profile
 */
export function renderSubjectProfile(subjectName, profile, containerClass = 'profile-container') {
    const token = localStorage.getItem('token');

    if (!profile) {
        // No profile exists - show create option (no comments for non-existent profiles)
        return `
            <div class="${containerClass} glass-profile-empty">
                <p style="color: var(--text-secondary); margin-bottom: 1rem;">
                    No profile information available for <strong>${escapeHtml(subjectName)}</strong>
                </p>
                ${token ? `
                    <button onclick="openProfileEditModal(${JSON.stringify(subjectName).replace(/"/g, '&quot;')}, null)" class="btn btn-primary btn-small">
                        ✏️ Create Profile
                    </button>
                ` : '<p style="color: var(--text-secondary); font-size: 0.9rem;">Login to create a profile</p>'}
            </div>
        `;
    }

    // Display existing profile
    const borderColor = profile.color || 'rgba(255, 255, 255, 0.2)';
    const titleColor = profile.color ? profile.color : '';

    // Safe serialization for HTML attributes
    const safeSubjectName = JSON.stringify(subjectName).replace(/'/g, '&apos;');
    const safeProfile = JSON.stringify(profile).replace(/'/g, '&apos;');

    return `
        <div class="${containerClass} glass-profile" style="border-left: 4px solid ${borderColor};">
            <div class="profile-header">
                <h3 class="profile-title" style="${titleColor ? `color: ${titleColor};` : ''}">${escapeHtml(subjectName)}</h3>
                ${token ? `
                    <button onclick='openProfileEditModal(${safeSubjectName}, ${safeProfile})' class="btn btn-primary btn-small">
                        ✏️ Edit Profile
                    </button>
                ` : ''}
            </div>

            ${profile.description ? `
                <div class="profile-section">
                    <strong class="profile-label">Description:</strong>
                    <p class="profile-text">${escapeHtml(profile.description)}</p>
                </div>
            ` : ''}

            <div class="profile-grid">
                ${profile.professor_name ? `
                    <div class="profile-field">
                        <strong class="profile-label">Professor:</strong>
                        <p class="profile-text">${escapeHtml(profile.professor_name)}</p>
                    </div>
                ` : ''}

                ${profile.course_code ? `
                    <div class="profile-field">
                        <strong class="profile-label">Course Code:</strong>
                        <p class="profile-text">${escapeHtml(profile.course_code)}</p>
                    </div>
                ` : ''}

                ${profile.semester || profile.year ? `
                    <div class="profile-field">
                        <strong class="profile-label">Semester:</strong>
                        <p class="profile-text">${escapeHtml(profile.semester || '')} ${escapeHtml(profile.year || '')}</p>
                    </div>
                ` : ''}

                ${profile.credits ? `
                    <div class="profile-field">
                        <strong class="profile-label">Credits:</strong>
                        <p class="profile-text">${escapeHtml(String(profile.credits))}</p>
                    </div>
                ` : ''}
            </div>

            ${profile.notes ? `
                <div class="profile-section">
                    <strong class="profile-label">Notes:</strong>
                    <p class="profile-text profile-notes">${escapeHtml(profile.notes)}</p>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Render comments section HTML
 * @param {string} subjectName - The subject name
 * @param {array} comments - List of comments
 * @returns {string} - HTML string for the comments section
 */
export function renderCommentsSection(subjectName, comments = []) {
    const token = localStorage.getItem('token');
    const currentUserId = getCurrentUserId();
    const safeSubject = subjectName.replace(/'/g, "\\'").replace(/"/g, '&quot;');

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
                    <div class="comment-form-actions" style="display: flex; justify-content: space-between; align-items: center;">
                        <label class="checkbox-label" style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: var(--text-secondary); cursor: pointer;">
                            <input type="checkbox" id="comment-anonymous-${escapeForId(subjectName)}">
                            <span>Post anonymously</span>
                        </label>
                        <button
                            onclick="postComment('${safeSubject}')"
                            class="btn btn-primary btn-small"
                        >
                            Post Comment
                        </button>
                    </div>
                </div>
            ` : `
                <div class="comments-login-message">
                    Please login to post comments
                </div>
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
export function renderComment(subjectName, comment, currentUserId) {
    const isOwner = currentUserId && comment.user_id === currentUserId;
    const formattedDate = formatDate(comment.created_at);

    // Handle anonymous display
    let userName = comment.user?.name || 'Unknown User';

    if (comment.is_anonymous) {
        userName = 'Anonymous User';
        if (isOwner) {
            userName += ' (You)';
        }
    }

    const safeSubject = subjectName.replace(/'/g, "\\'").replace(/"/g, '&quot;');

    return `
        <div class="comment small-comment" id="comment-${comment.id}" data-comment-id="${comment.id}">
            <div class="comment-header">
                <span class="comment-author ${comment.is_anonymous ? 'anonymous' : ''}">${escapeHtml(userName)}</span>
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
 * Get current user ID from token
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

/**
 * Format date string
 */
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

/**
 * Escape string for ID usage
 */
function escapeForId(text) {
    return String(text).replace(/[^a-zA-Z0-9]/g, '_');
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
