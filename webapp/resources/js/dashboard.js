/**
 * Dashboard Main - JavaScript Module
 * Handles file tree, favorites, search, and main dashboard functionality
 */

import { state, buildFileIndex, clearFileIndex } from './modules/state.js';
import { fetchAPI } from './modules/api.js';
import { loadFavorites, toggleFavorite, updateFavoriteCount } from './modules/favorites.js';
import { buildTreeStructure, updateStarIcon, buildSubjectTabsHTML } from './modules/ui.js';
import { performSearchFromRoute, displaySearchResults } from './modules/search.js';
import { switchTab } from './modules/tabs.js';
import { renderSidebarSubjects } from './modules/sidebar.js';

// Expose displaySearchResults globally
window.displaySearchResults = displaySearchResults;

// Route parameters - will be set by blade template
window.dashboardRouteParams = window.dashboardRouteParams || {};

// Expose functions to window for HTML event handlers
window.toggleFavorite = (subjectName, event) => {
    toggleFavorite(subjectName, event, (name) => {
        updateStarIcon(name);
        // Rebuild tree to reorder subjects if needed
        buildTreeStructure(state.allFiles);
    });
};

window.switchTab = switchTab;

window.downloadFile = async function (fileId, filename) {
    try {
        const response = await fetch(`/api/files/${fileId}/download`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            alert('Failed to download file');
        }
    } catch (error) {
        alert('Error downloading file');
    }
};

window.deleteFile = async function (fileId) {
    if (!confirm('Are you sure you want to delete this file?')) {
        return;
    }

    try {
        // O(1) lookup: Find which subject this file belongs to
        const fileSubject = state.fileIdIndex.get(fileId);

        // Delete the file
        const response = await fetchAPI(`/api/files/${fileId}`, { method: 'DELETE' });

        // Clear all subject caches and file index to force reload of counts
        Object.keys(state.subjectFiles).forEach(subjectName => {
            clearFileIndex(subjectName);
            delete state.subjectFiles[subjectName];
        });

        // Reload dashboard with cache bypass to get fresh counts
        window.loadDashboard(true);

        // Show success message
        alert('File deleted successfully');
    } catch (error) {
        const errorMessage = error.message || 'Failed to delete file';
        alert(`Failed to delete file: ${errorMessage}`);
    }
};

window.filterByOwner = function (userId, userName, event) {
    if (event) event.preventDefault();
    window.location.href = `/dashboard/user/${userId}/${encodeURIComponent(userName)}`;
};

async function filterByOwnerFromRoute() {
    const routeParams = window.dashboardRouteParams;
    const loading = document.getElementById('loadingFiles');
    const treeView = document.getElementById('treeView');

    if (loading) loading.classList.remove('hidden');
    if (treeView) treeView.style.display = 'none';

    try {
        const response = await fetchAPI(`/api/files?user_id=${routeParams.filterUserId}&per_page=10000`);
        const files = response.data || [];

        if (loading) loading.classList.add('hidden');
        if (treeView) treeView.style.display = 'block';

        buildTreeStructure(files);

        // Show notification with back link
        const notification = document.createElement('div');
        notification.className = 'alert alert-success';
        notification.style.position = 'fixed';
        notification.style.top = '80px';
        notification.style.right = '20px';
        notification.style.zIndex = '3000';

        const textNode = document.createTextNode(`Showing files by ${routeParams.filterUserName} (${files.length} files) `);
        notification.appendChild(textNode);

        const clearLink = document.createElement('a');
        clearLink.href = '/dashboard';
        clearLink.style.marginLeft = '1rem';
        clearLink.style.padding = '0.25rem 0.75rem';
        clearLink.style.border = 'none';
        clearLink.style.background = 'white';
        clearLink.style.color = 'var(--primary-color)';
        clearLink.style.borderRadius = 'var(--radius-sm)';
        clearLink.style.cursor = 'pointer';
        clearLink.style.fontWeight = '600';
        clearLink.style.textDecoration = 'none';
        clearLink.style.display = 'inline-block';
        clearLink.textContent = '✕ Clear Filter';

        notification.appendChild(clearLink);
        document.body.appendChild(notification);
    } catch (error) {
        if (loading) loading.classList.add('hidden');
        if (treeView) treeView.style.display = 'block';
    }
}

window.loadSubjectContent = async function (subjectName) {
    const noSubjectSelected = document.getElementById('noSubjectSelected');
    const subjectContent = document.getElementById('subjectContent');
    const loading = document.getElementById('loadingFiles');

    // Hide "no subject selected" message
    if (noSubjectSelected) noSubjectSelected.classList.add('hidden');

    // Show loading
    if (loading) loading.classList.remove('hidden');
    if (subjectContent) subjectContent.classList.add('hidden');

    try {
        const subject = state.allFiles.find(s => s.subject_name === subjectName);
        const hasProfile = subject?.has_profile || false;

        const promises = [
            fetchAPI(`/api/files?subject_name=${encodeURIComponent(subjectName)}&per_page=1000`),
            fetch(`/api/subjects/${encodeURIComponent(subjectName)}/comments`, {
                headers: { 'Accept': 'application/json' }
            }).then(res => res.ok ? res : null).catch(() => null)
        ];

        if (hasProfile) {
            promises.push(
                fetch(`/api/subject-profiles/${encodeURIComponent(subjectName)}`, {
                    headers: { 'Accept': 'application/json' }
                }).then(res => res.ok ? res : null).catch(() => null)
            );
        }

        const results = await Promise.all(promises);
        const filesResponse = results[0];
        const commentsResponse = results[1];
        const profileResponse = hasProfile ? results[2] : null;

        const files = filesResponse.data || [];

        let comments = [];
        if (commentsResponse) {
            const data = await commentsResponse.json();
            comments = data.comments || [];
        }

        let profile = null;
        if (profileResponse) {
            const data = await profileResponse.json();
            profile = data.profile;
        }

        state.subjectFiles[subjectName] = files;
        buildFileIndex(subjectName, files);

        const tree = {};
        files.forEach(file => {
            if (!tree[file.category]) {
                tree[file.category] = [];
            }
            tree[file.category].push(file);
        });

        // Build subject content with header
        const subjectHeader = `
            <div class="subject-content-header">
                <div class="subject-title-section">
                    <h1>${escapeHtml(subjectName)}</h1>
                    <p class="subject-meta">${subject?.code || ''} • ${files.length} files</p>
                </div>
            </div>
        `;

        if (subjectContent) {
            subjectContent.innerHTML = subjectHeader + buildSubjectTabsHTML(tree, subjectName, profile, comments);
            subjectContent.classList.remove('hidden');
        }

        if (loading) loading.classList.add('hidden');
    } catch (error) {
        if (subjectContent) {
            subjectContent.innerHTML = '<p class="error" style="padding: 1rem;">Failed to load subject content</p>';
            subjectContent.classList.remove('hidden');
        }
        if (loading) loading.classList.add('hidden');
    }
};

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

window.reloadSubject = async function (subjectName) {
    clearFileIndex(subjectName);
    delete state.subjectFiles[subjectName];

    // Reload the subject content in the new sidebar-based structure
    if (typeof window.loadSubjectContent === 'function') {
        await window.loadSubjectContent(subjectName);
    }
};

function loadSubjectFromRoute() {
    const routeParams = window.dashboardRouteParams;
    if (routeParams.selectedSubject) {
        // Load the selected subject content
        setTimeout(() => {
            window.selectSubject(routeParams.selectedSubject);
        }, 100);
    }
}

async function loadFiles(bypassCache = false) {
    try {
        const options = {};
        if (bypassCache) {
            options.headers = { 'X-Bypass-Cache': 'true' };
        }
        const response = await fetchAPI('/api/subjects?with_counts=true', options);
        const subjects = response.subjects || [];

        state.allFiles = subjects;

        // Populate sidebar with subjects
        renderSidebarSubjects(subjects);
    } catch (error) {
        console.error('Failed to load subjects:', error);
    }
}

async function loadStats() {
    try {
        const response = await fetchAPI('/api/stats');
        const totalFiles = document.getElementById('totalFiles');
        const totalSubjects = document.getElementById('totalSubjects');
        const totalStorage = document.getElementById('totalStorage');
        const favoriteCount = document.getElementById('favoriteCount');

        if (totalFiles) totalFiles.textContent = response.total_files || 0;
        if (totalSubjects) totalSubjects.textContent = response.total_subjects || 0;
        if (totalStorage) totalStorage.textContent = ((response.total_storage_bytes || 0) / (1024 * 1024)).toFixed(2) + ' MB';

        if (favoriteCount) {
            favoriteCount.textContent = state.favorites.length || 0;
        }
    } catch (error) {
    }
}

window.loadDashboard = async function (bypassCache = false) {
    await loadFavorites();
    await Promise.all([
        loadFiles(bypassCache),
        loadStats()
    ]);

    const routeParams = window.dashboardRouteParams;
    if (routeParams.searchQuery) {
        performSearchFromRoute();
    } else if (routeParams.profileSubject) {
        if (typeof window.viewSubjectProfile === 'function') {
            window.viewSubjectProfile(routeParams.profileSubject, { stopPropagation: () => { } });
        }
    } else if (routeParams.filterUserId) {
        filterByOwnerFromRoute();
    } else if (routeParams.selectedSubject) {
        loadSubjectFromRoute();
    }
};

function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
        return;
    }
}

// Make fetchAPI available globally for legacy support
window.fetchAPI = fetchAPI;

// Event delegation
document.addEventListener('click', (event) => {
    const tabBtn = event.target.closest('.tab-btn');
    if (tabBtn && tabBtn.dataset.subjectId && tabBtn.dataset.tabName) {
        window.switchTab(event, tabBtn.dataset.subjectId, tabBtn.dataset.tabName);
        return;
    }

    const ownerLink = event.target.closest('.owner-filter-link');
    if (ownerLink && ownerLink.dataset.ownerId) {
        event.preventDefault();
        const ownerId = parseInt(ownerLink.dataset.ownerId);
        const ownerName = ownerLink.dataset.ownerName;
        window.filterByOwner(ownerId, ownerName, event);
        return;
    }

    if (event.target.closest('.download-btn')) {
        const button = event.target.closest('.download-btn');
        const fileId = button.dataset.fileId;
        const filename = button.dataset.filename;
        if (fileId && filename) {
            window.downloadFile(parseInt(fileId), filename);
        }
    }

    if (event.target.closest('.delete-btn')) {
        const button = event.target.closest('.delete-btn');
        const fileId = button.dataset.fileId;
        if (fileId) {
            window.deleteFile(parseInt(fileId));
        }
    }
});

// Search handler
async function performSearch(query) {
    const searchInFilename = document.getElementById('searchInFilename')?.checked ?? true;
    const searchInContent = document.getElementById('searchInContent')?.checked ?? true;

    if (!query || query.trim().length === 0) {
        return;
    }

    try {
        const response = await fetchAPI(`/api/search?q=${encodeURIComponent(query)}&size=100`);
        const results = response.results || [];

        // Filter results based on user preferences
        let filteredResults = results;
        if (!searchInContent && !searchInFilename) {
            filteredResults = [];
        } else if (!searchInContent && searchInFilename) {
            // Only search in filenames - show only files where filename matches
            filteredResults = results.filter(r =>
                r.source.filename.toLowerCase().includes(query.toLowerCase()) ||
                r.source.original_filename.toLowerCase().includes(query.toLowerCase())
            );
        } else if (searchInContent && !searchInFilename) {
            // Only search in content - show only files with content highlights (exclude filename matches)
            filteredResults = results.filter(r => {
                // Must have content highlight
                const hasContentHighlight = r.highlight && r.highlight.content && r.highlight.content.length > 0;
                if (!hasContentHighlight) {
                    return false;
                }
                // Must NOT match filename
                const filenameMatch = r.source.filename.toLowerCase().includes(query.toLowerCase()) ||
                                    r.source.original_filename.toLowerCase().includes(query.toLowerCase());
                return !filenameMatch;
            });
        }
        // If both are checked, show all results (default Elasticsearch behavior)

        // Clear sidebar selection
        document.querySelectorAll('.subject-nav-item').forEach(item => {
            item.classList.remove('active');
        });

        // Hide normal content, show search results
        const noSubjectSelected = document.getElementById('noSubjectSelected');
        const subjectContent = document.getElementById('subjectContent');
        const searchResults = document.getElementById('searchResults');
        const searchCount = document.getElementById('searchCount');

        if (noSubjectSelected) noSubjectSelected.classList.add('hidden');
        if (subjectContent) subjectContent.classList.add('hidden');
        if (searchResults) {
            searchResults.classList.remove('hidden');
            // Scroll to top of results
            setTimeout(() => {
                searchResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
        if (searchCount) searchCount.textContent = filteredResults.length;

        // Display results using the search module
        if (typeof window.displaySearchResults === 'function') {
            window.displaySearchResults(filteredResults, query, searchInContent, searchInFilename);
        }
    } catch (error) {
        alert('Search failed: ' + error.message);
    }
}

// Global search input handler
const globalSearchInput = document.getElementById('globalSearch');
if (globalSearchInput) {
    globalSearchInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            const query = event.target.value.trim();
            performSearch(query);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    window.loadDashboard();
});
