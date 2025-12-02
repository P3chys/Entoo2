/**
 * Dashboard Redesign Main JavaScript
 * Coordinates all UI modules and data fetching
 */

import './bootstrap.js';
import { initTheme } from './modules/theme.js';
import { initTabs, switchToTab, updateAllTabBadges, initTabFromURL, initSortHandlers } from './modules/tabNavigation.js';
import { initSidebar, selectSubject, toggleSidebar } from './modules/sidebarManager.js';
import {
    DOCUMENT_TYPES,
    getDocumentTypeByKey,
    formatFileSize,
    formatRelativeTime,
    getUserInitials,
    getAvatarColor
} from './modules/documentTypes.js';
import { fetchAPI } from './modules/api.js';

// Global state
let currentSubject = null;
let allFiles = [];
let allSubjects = [];
let allComments = [];

/**
 * Initialize dashboard on DOM ready
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Dashboard Redesign Initializing...');

    // Initialize theme
    initTheme();

    // Get initial data from route params
    const params = window.dashboardRouteParams || {};
    currentSubject = params.selectedSubject || null;

    // Fetch initial data
    await loadDashboardData();

    // Initialize UI modules
    initializeModules();

    // Load subject-specific content if selected
    if (currentSubject) {
        await loadSubjectContent(currentSubject);
    }

    console.log('Dashboard Redesign Initialized');
});

/**
 * Load initial dashboard data
 */
async function loadDashboardData() {
    try {
        // Fetch subjects
        const subjectsResponse = await fetchAPI('/api/subjects');
        allSubjects = subjectsResponse.data || [];

        console.log(`Loaded ${allSubjects.length} subjects`);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

/**
 * Initialize all UI modules
 */
function initializeModules() {
    // Initialize sidebar with subjects
    initSidebar(allSubjects, currentSubject, handleSubjectChange);

    // Initialize tabs
    initTabs(handleTabChange);
    initTabFromURL();

    // Initialize sort handlers
    initSortHandlers(handleSortChange);

    // Setup mobile menu toggle
    setupMobileMenuToggle();
}

/**
 * Handle subject change
 */
async function handleSubjectChange(subjectName) {
    console.log('Subject changed to:', subjectName);
    currentSubject = subjectName;

    // Update URL
    const newUrl = `/dashboard?subject=${encodeURIComponent(subjectName)}`;
    window.history.pushState({}, '', newUrl);

    // Load subject content
    await loadSubjectContent(subjectName);
}

/**
 * Load subject-specific content
 */
async function loadSubjectContent(subjectName) {
    try {
        // Update subject header
        await updateSubjectHeader(subjectName);

        // Load files for this subject
        const filesResponse = await fetchAPI(`/api/files?subject=${encodeURIComponent(subjectName)}`);
        allFiles = filesResponse.data || [];

        // Load comments for this subject
        const commentsResponse = await fetchAPI(`/api/subjects/${encodeURIComponent(subjectName)}/comments`);
        allComments = commentsResponse.comments || [];

        // Update tab content
        updateAllTabContent();

        console.log(`Loaded ${allFiles.length} files and ${allComments.length} comments for ${subjectName}`);
    } catch (error) {
        console.error('Error loading subject content:', error);
    }
}

/**
 * Update subject header with profile data
 */
async function updateSubjectHeader(subjectName) {
    try {
        // Fetch subject profile
        const profile = await fetchAPI(`/api/subject-profiles/${encodeURIComponent(subjectName)}`);

        // Update header elements
        document.getElementById('subjectTitle').textContent = subjectName;
        document.getElementById('subjectCode').textContent = profile.course_code || '';
        document.getElementById('professorName').textContent = profile.professor_name || '';
        document.getElementById('professorNameFull').textContent = profile.professor_name || '';
        document.getElementById('subjectDescription').textContent = profile.description || '';

        // Show/hide elements based on data
        const professorInfo = document.getElementById('subjectProfessorInfo');
        if (professorInfo && profile.professor_name) {
            professorInfo.style.display = 'flex';
        }

        // Update metadata
        if (profile.semester) {
            document.getElementById('metaSemester').style.display = 'flex';
            document.getElementById('metaSemesterValue').textContent = profile.semester;
        }

        if (profile.year) {
            document.getElementById('metaYear').style.display = 'flex';
            document.getElementById('metaYearValue').textContent = profile.year;
        }

        if (profile.credits) {
            document.getElementById('metaCredits').style.display = 'flex';
            document.getElementById('metaCreditsValue').textContent = profile.credits;
        }

    } catch (error) {
        console.log('No profile found for subject, using defaults');
        document.getElementById('subjectTitle').textContent = subjectName;
    }
}

/**
 * Handle tab change
 */
function handleTabChange(tabId, category) {
    console.log('Tab changed to:', tabId, category);

    // Update content for the active tab
    updateTabContent(tabId, category);
}

/**
 * Update all tab content
 */
function updateAllTabContent() {
    // Count files by category
    const counts = {
        'notes': allFiles.filter(f => f.category === 'Materialy').length,
        'case-briefs': allFiles.filter(f => f.category === 'Prednasky').length,
        'statutes': allFiles.filter(f => f.category === 'Seminare').length,
        'past-papers': allFiles.filter(f => f.category === 'Otazky').length,
        'discussion': allComments.length
    };

    // Update badges
    updateAllTabBadges(counts);

    // Update total documents count
    const totalDocs = allFiles.length;
    document.getElementById('metaDocumentsValue').textContent = totalDocs;

    // Update current tab content
    const currentTab = document.querySelector('.tab.active');
    if (currentTab) {
        const tabId = currentTab.dataset.tab;
        const category = currentTab.dataset.type;
        updateTabContent(tabId, category);
    }
}

/**
 * Update specific tab content
 */
function updateTabContent(tabId, category) {
    if (tabId === 'discussion') {
        renderComments();
    } else {
        renderDocuments(tabId, category);
    }
}

/**
 * Render documents for a category
 */
function renderDocuments(tabId, category) {
    const gridElement = document.getElementById(`${tabId}-grid`);
    if (!gridElement) return;

    // Filter files by category
    const files = allFiles.filter(f => f.category === category);

    if (files.length === 0) {
        gridElement.innerHTML = `
            <div class="documents-empty">
                <div class="documents-empty-icon">📄</div>
                <h3 class="documents-empty-title">No documents yet</h3>
                <p class="documents-empty-description">Upload files to get started</p>
            </div>
        `;
        return;
    }

    // Render document cards
    gridElement.innerHTML = files.map(file => renderDocumentCard(file)).join('');

    // Attach event listeners
    attachDocumentCardListeners();
}

/**
 * Render a single document card
 */
function renderDocumentCard(file) {
    const extension = file.file_extension.toUpperCase();
    const fileSize = formatFileSize(file.file_size);
    const uploadDate = formatRelativeTime(file.created_at);
    const authorInitials = getUserInitials(file.user?.name || 'Unknown');
    const authorName = file.user?.name || 'Unknown';

    return `
        <div class="document-card" data-file-id="${file.id}">
            <div class="document-badge ${extension.toLowerCase()}">${extension}</div>
            <div class="document-info">
                <h3 class="document-title">${escapeHtml(file.original_filename)}</h3>
                <div class="document-meta">
                    <div class="document-author">
                        <div class="author-avatar">${authorInitials}</div>
                        <span class="author-name">${escapeHtml(authorName)}</span>
                    </div>
                    <span class="document-date">📅 ${uploadDate}</span>
                    <span class="document-size">${fileSize}</span>
                </div>
            </div>
            <div class="document-actions">
                <span class="download-count">0 downloads</span>
                <button class="btn-icon-download" data-file-id="${file.id}" title="Download">
                    ⬇️
                </button>
                <button class="btn-icon-more" data-file-id="${file.id}" title="More options">
                    ⋯
                </button>
            </div>
        </div>
    `;
}

/**
 * Render comments
 */
function renderComments() {
    const commentsListElement = document.getElementById('commentsList');
    if (!commentsListElement) return;

    if (allComments.length === 0) {
        commentsListElement.innerHTML = `
            <div class="comments-empty">
                <div class="comments-empty-icon">💬</div>
                <h3 class="comments-empty-title">No comments yet</h3>
                <p class="comments-empty-description">Be the first to start a discussion</p>
            </div>
        `;
        return;
    }

    commentsListElement.innerHTML = allComments.map(comment => renderComment(comment)).join('');
}

/**
 * Render a single comment
 */
function renderComment(comment) {
    const isAnonymous = comment.is_anonymous;
    const authorName = isAnonymous ? 'Anonymous' : (comment.user?.name || 'Unknown');
    const authorInitials = isAnonymous ? '?' : getUserInitials(authorName);
    const colorClass = isAnonymous ? 'anonymous' : getAvatarColor(authorName);
    const timestamp = formatRelativeTime(comment.created_at);

    return `
        <div class="comment-item">
            <div class="comment-avatar color-${colorClass}">${authorInitials}</div>
            <div class="comment-content">
                <div class="comment-header">
                    <span class="commenter-name ${isAnonymous ? 'anonymous' : ''}">${escapeHtml(authorName)}</span>
                    <span class="comment-time">${timestamp}</span>
                </div>
                <p class="comment-text">${escapeHtml(comment.comment)}</p>
            </div>
        </div>
    `;
}

/**
 * Attach event listeners to document cards
 */
function attachDocumentCardListeners() {
    // Download buttons
    document.querySelectorAll('.btn-icon-download').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const fileId = btn.dataset.fileId;
            await downloadFile(fileId);
        });
    });

    // More options buttons
    document.querySelectorAll('.btn-icon-more').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const fileId = btn.dataset.fileId;
            showFileOptions(fileId);
        });
    });

    // Card click to view/download
    document.querySelectorAll('.document-card').forEach(card => {
        card.addEventListener('click', () => {
            const fileId = card.dataset.fileId;
            downloadFile(fileId);
        });
    });
}

/**
 * Download a file
 */
async function downloadFile(fileId) {
    try {
        window.location.href = `/api/files/${fileId}/download`;
    } catch (error) {
        console.error('Error downloading file:', error);
    }
}

/**
 * Show file options menu
 */
function showFileOptions(fileId) {
    // TODO: Implement options menu
    console.log('Show options for file:', fileId);
}

/**
 * Handle sort change
 */
function handleSortChange(tabId, sortValue) {
    console.log('Sort changed for tab:', tabId, 'to:', sortValue);

    // TODO: Implement sorting logic
}

/**
 * Setup mobile menu toggle
 */
function setupMobileMenuToggle() {
    // Add hamburger menu button if needed
    // This would be in the navbar component
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
