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
        // No profile exists - show create option
        return `
            <div class="${containerClass} glass-profile-empty">
                <p style="color: var(--text-secondary); margin-bottom: 1rem;">
                    No profile information available for <strong>${escapeHtml(subjectName)}</strong>
                </p>
                ${token ? `
                    <button onclick="openProfileEditModal('${escapeHtml(subjectName).replace(/'/g, "\\'")}', null)" class="btn btn-primary btn-small">
                        ✏️ Create Profile
                    </button>
                ` : '<p style="color: var(--text-secondary); font-size: 0.9rem;">Login to create a profile</p>'}
            </div>
        `;
    }

    // Display existing profile
    return `
        <div class="${containerClass} glass-profile">
            <div class="profile-header">
                <h3 class="profile-title">${escapeHtml(subjectName)}</h3>
                ${token ? `
                    <button onclick='openProfileEditModal(${JSON.stringify(subjectName)}, ${JSON.stringify(profile)})' class="btn btn-primary btn-small">
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
