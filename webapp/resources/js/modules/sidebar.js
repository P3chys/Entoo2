/**
 * Sidebar Navigation Module
 * Handles rendering subjects in the sidebar with semester groups
 */

import { state } from './state.js';
import { isFavorite } from './favorites.js';

/**
 * Render sidebar subjects organized by semester
 */
export function renderSidebarSubjects(subjects) {
    if (!subjects || subjects.length === 0) return;

    // Group subjects by semester (mock for now, can be extended from backend)
    const grouped = {
        semester1: [],
        semester2: [],
        semester3: [],
        semester4: [],
        semester5: [],
        semester6: [],
        other: []
    };

    subjects.forEach(subject => {
        // For now, we'll use a simple heuristic
        // Real implementation should use subject.semester from backend
        const semester = subject.semester || 'other';
        if (semester === 1 || semester === '1') {
            grouped.semester1.push(subject);
        } else if (semester === 2 || semester === '2') {
            grouped.semester2.push(subject);
        } else {
            grouped.other.push(subject);
        }
    });

    // Render each group
    renderSubjectGroup('semester1Subjects', grouped.semester1);
    renderSubjectGroup('semester2Subjects', grouped.semester2);
    renderSubjectGroup('semester3Subjects', grouped.semester3);
    renderSubjectGroup('semester4Subjects', grouped.semester4);
    renderSubjectGroup('semester5Subjects', grouped.semester5);
    renderSubjectGroup('semester6Subjects', grouped.semester6);
    renderSubjectGroup('otherSubjects', grouped.other);
}

/**
 * Render subjects in a specific group
 */
function renderSubjectGroup(containerId, subjects) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (subjects.length === 0) {
        container.innerHTML = '<div class="loading-placeholder">No subjects</div>';
        return;
    }

    // Sort: favorites first, then alphabetically
    const sorted = subjects.sort((a, b) => {
        const aFav = isFavorite(a.subject_name);
        const bFav = isFavorite(b.subject_name);

        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
        return a.subject_name.localeCompare(b.subject_name);
    });

    container.innerHTML = sorted.map(subject => createSubjectNavItem(subject)).join('');
}

/**
 * Create a subject navigation item HTML
 */
function createSubjectNavItem(subject) {
    const initials = getSubjectInitials(subject.subject_name);
    const code = subject.code || 'N/A';
    const isActive = state.currentSubject === subject.subject_name;

    return `
        <div class="subject-nav-item ${isActive ? 'active' : ''}" 
             data-subject="${escapeHtml(subject.subject_name)}"
             onclick="selectSubject('${escapeHtml(subject.subject_name)}')">
            <div class="subject-avatar">${initials}</div>
            <div class="subject-info">
                <div class="subject-name">${escapeHtml(subject.subject_name)}</div>
                <div class="subject-code">${escapeHtml(code)}</div>
            </div>
        </div>
    `;
}

/**
 * Get initials from subject name
 */
function getSubjectInitials(name) {
    if (!name) return 'S';

    const words = name.split(' ').filter(w => w.length > 0);
    if (words.length === 1) {
        return name.substring(0, 2).toUpperCase();
    }
    return words.slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Select a subject (to be called from global scope)
 */
window.selectSubject = function (subjectName) {
    state.currentSubject = subjectName;

    // Update active states
    document.querySelectorAll('.subject-nav-item').forEach(item => {
        if (item.dataset.subject === subjectName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Hide search results when selecting a subject
    const searchResults = document.getElementById('searchResults');
    if (searchResults) {
        searchResults.classList.add('hidden');
    }

    // Load subject content in main area
    if (window.loadSubjectContent) {
        window.loadSubjectContent(subjectName);
    }
};
