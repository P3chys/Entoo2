/**
 * Sidebar Manager Module
 * Handles sidebar subject list with semester grouping
 */

import { getSubjectInitials, getAvatarColor } from './documentTypes.js';

let subjects = [];
let currentSubject = null;
let onSubjectChangeCallback = null;

/**
 * Initialize sidebar
 */
export function initSidebar(subjectsData, selectedSubject, onSubjectChange) {
    subjects = subjectsData || [];
    currentSubject = selectedSubject;
    onSubjectChangeCallback = onSubjectChange;

    renderSidebar();
}

/**
 * Render sidebar with semester groups
 */
function renderSidebar() {
    // Group subjects by semester
    const grouped = groupSubjectsBySemester(subjects);

    // Render each semester group (1-6 + unassigned)
    for (let semester = 1; semester <= 6; semester++) {
        const listElement = document.getElementById(`semester-${semester}-list`);
        if (listElement) {
            const semesterSubjects = grouped[semester] || [];
            listElement.innerHTML = renderSubjectList(semesterSubjects, semester);
        }
    }

    // Render non-assigned subjects
    const unassignedList = document.getElementById('semester-unassigned-list');
    if (unassignedList) {
        const unassignedSubjects = grouped['unassigned'] || [];
        unassignedList.innerHTML = renderSubjectList(unassignedSubjects, 'unassigned');
    }

    // Attach click handlers
    attachSubjectClickHandlers();

    // Hide empty semester groups
    hideEmptySemesters();
}

/**
 * Group subjects by semester
 */
function groupSubjectsBySemester(subjectsList) {
    const grouped = {
        1: [],
        2: [],
        3: [],
        4: [],
        5: [],
        6: [],
        'unassigned': []
    };

    subjectsList.forEach(subject => {
        const semester = subject.semester || 'unassigned';

        // If semester is a number between 1-6, group it
        if (semester >= 1 && semester <= 6) {
            grouped[semester].push(subject);
        } else {
            grouped['unassigned'].push(subject);
        }
    });

    return grouped;
}

/**
 * Render subject list HTML
 */
function renderSubjectList(semesterSubjects, semester) {
    if (!semesterSubjects || semesterSubjects.length === 0) {
        return ''; // Empty list
    }

    return semesterSubjects.map(subject => {
        const isActive = currentSubject === subject.subject_name;
        const initials = getSubjectInitials(subject.subject_name);
        const colorClass = getAvatarColor(subject.subject_name);
        const courseCode = subject.course_code || '';

        return `
            <li>
                <a
                    href="#"
                    class="sidebar-subject-card ${isActive ? 'active' : ''}"
                    data-subject="${escapeHtml(subject.subject_name)}"
                    data-semester="${semester}"
                >
                    <div class="subject-avatar color-${colorClass}">
                        ${escapeHtml(initials)}
                    </div>
                    <div class="subject-info">
                        <div class="subject-name">${escapeHtml(subject.subject_name)}</div>
                        ${courseCode ? `<div class="subject-code">${escapeHtml(courseCode)}</div>` : ''}
                    </div>
                </a>
            </li>
        `;
    }).join('');
}

/**
 * Attach click handlers to subject cards
 */
function attachSubjectClickHandlers() {
    const cards = document.querySelectorAll('.sidebar-subject-card');

    cards.forEach(card => {
        card.addEventListener('click', (e) => {
            e.preventDefault();

            const subjectName = card.dataset.subject;
            selectSubject(subjectName);

            // Call callback
            if (onSubjectChangeCallback) {
                onSubjectChangeCallback(subjectName);
            }
        });
    });
}

/**
 * Select a subject (update active state)
 */
export function selectSubject(subjectName) {
    currentSubject = subjectName;

    // Update active state
    const cards = document.querySelectorAll('.sidebar-subject-card');
    cards.forEach(card => {
        const isActive = card.dataset.subject === subjectName;
        card.classList.toggle('active', isActive);
    });
}

/**
 * Hide empty semester groups
 */
function hideEmptySemesters() {
    for (let semester = 1; semester <= 6; semester++) {
        const group = document.querySelector(`.semester-group[data-semester="${semester}"]`);
        const list = document.getElementById(`semester-${semester}-list`);

        if (group && list) {
            const isEmpty = !list.innerHTML.trim();
            group.style.display = isEmpty ? 'none' : 'block';
        }
    }

    // Handle unassigned group
    const unassignedGroup = document.querySelector('.semester-group[data-semester="unassigned"]');
    const unassignedList = document.getElementById('semester-unassigned-list');

    if (unassignedGroup && unassignedList) {
        const isEmpty = !unassignedList.innerHTML.trim();
        unassignedGroup.style.display = isEmpty ? 'none' : 'block';
    }
}

/**
 * Update subject list
 */
export function updateSubjects(newSubjects) {
    subjects = newSubjects || [];
    renderSidebar();
}

/**
 * Toggle sidebar on mobile
 */
export function toggleSidebar(show) {
    const sidebar = document.getElementById('dashboardSidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (sidebar && overlay) {
        if (show === undefined) {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
        } else {
            sidebar.classList.toggle('open', show);
            overlay.classList.toggle('active', show);
        }
    }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export default {
    initSidebar,
    selectSubject,
    updateSubjects,
    toggleSidebar
};
