/**
 * Dashboard Main - JavaScript Module
 * Handles file tree, favorites, search, and main dashboard functionality
 */

import { state } from './modules/state.js';
import { fetchAPI } from './modules/api.js';
import { loadFavorites, toggleFavorite, updateFavoriteCount } from './modules/favorites.js';
import { buildTreeStructure, updateStarIcon, buildSubjectTabsHTML } from './modules/ui.js';
import { performSearchFromRoute } from './modules/search.js';
import { switchTab } from './modules/tabs.js';

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
        // Find which subject this file belongs to before deleting
        let fileSubject = null;

        // Search through cached subject files to find the subject
        for (const [subjectName, files] of Object.entries(state.subjectFiles)) {
            if (files.some(f => (f.id || f.file_id) === fileId)) {
                fileSubject = subjectName;
                break;
            }
        }

        // Delete the file
        await fetchAPI(`/api/files/${fileId}`, { method: 'DELETE' });

        // Clear all subject caches to force reload of counts
        Object.keys(state.subjectFiles).forEach(subjectName => {
            delete state.subjectFiles[subjectName];
        });

        // Reload dashboard with cache bypass to get fresh counts
        window.loadDashboard(true);
    } catch (error) {
        alert('Failed to delete file');
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
        console.error('Failed to filter by owner:', error);
    }
}

window.toggleSubject = async function (element, subjectName) {
    const icon = element.querySelector('.subject-icon');
    const categories = element.nextElementSibling;

    const isExpanded = icon.classList.contains('expanded');

    if (isExpanded) {
        icon.classList.remove('expanded');
        categories.classList.remove('expanded');
    } else {
        icon.classList.add('expanded');
        categories.classList.add('expanded');

        if (!state.subjectFiles[subjectName]) {
            categories.innerHTML = '<div class="loading" style="padding: 1rem;">Loading files and profile...</div>';

            try {
                const subject = state.allFiles.find(s => s.subject_name === subjectName);
                const hasProfile = subject?.has_profile || false;

                const promises = [
                    fetchAPI(`/api/files?subject_name=${encodeURIComponent(subjectName)}&per_page=1000`)
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
                const profileResponse = results[1] || null;

                const files = filesResponse.data || [];
                let profile = null;
                if (profileResponse) {
                    const data = await profileResponse.json();
                    profile = data.profile;
                }

                state.subjectFiles[subjectName] = files;

                // Update the header count to match actual files loaded
                const actualCount = files.length;
                const countSpan = element.querySelector('.subject-count');
                if (countSpan) {
                    countSpan.textContent = `${actualCount} file${actualCount !== 1 ? 's' : ''}`;
                }

                const tree = {};
                files.forEach(file => {
                    if (!tree[file.category]) {
                        tree[file.category] = [];
                    }
                    tree[file.category].push(file);
                });

                categories.innerHTML = buildSubjectTabsHTML(tree, subjectName, profile);
            } catch (error) {
                categories.innerHTML = '<p class="error" style="padding: 1rem;">Failed to load files</p>';
            }
        }
    }
};

window.reloadSubject = async function (subjectName) {
    delete state.subjectFiles[subjectName];

    const subjectDiv = document.querySelector(`.tree-subject[data-subject="${CSS.escape(subjectName)}"]`);
    if (subjectDiv) {
        const header = subjectDiv.querySelector('.subject-header');
        const icon = header.querySelector('.subject-icon');

        if (icon.classList.contains('expanded')) {
            await window.toggleSubject(header, subjectName);
            await window.toggleSubject(header, subjectName);
        }
    }
};

function expandSubjectFromRoute() {
    const routeParams = window.dashboardRouteParams;
    setTimeout(() => {
        const subjects = document.querySelectorAll('.subject-header');
        subjects.forEach(subjectHeader => {
            const titleSpan = subjectHeader.querySelector('.subject-title span:nth-child(2)');
            if (titleSpan && titleSpan.textContent === routeParams.selectedSubject) {
                window.toggleSubject(subjectHeader, routeParams.selectedSubject);
            }
        });
    }, 100);
}

async function loadFiles(bypassCache = false) {
    const loading = document.getElementById('loadingFiles');
    const noFiles = document.getElementById('noFiles');
    const treeView = document.getElementById('treeView');

    if (loading) loading.classList.remove('hidden');

    const expandedSubjects = [];
    if (treeView) {
        const expandedIcons = treeView.querySelectorAll('.subject-icon.expanded');
        expandedIcons.forEach(icon => {
            const subjectHeader = icon.closest('.subject-header');
            if (subjectHeader) {
                const subjectTitle = subjectHeader.querySelector('.subject-title span:nth-child(2)');
                if (subjectTitle) {
                    expandedSubjects.push(subjectTitle.textContent);
                }
            }
        });
    }

    try {
        const options = {};
        if (bypassCache) {
            options.headers = { 'X-Bypass-Cache': 'true' };
        }
        const response = await fetchAPI('/api/subjects?with_counts=true', options);
        const subjects = response.subjects || [];

        state.allFiles = subjects;

        if (loading) loading.classList.add('hidden');

        if (subjects.length === 0) {
            if (noFiles) noFiles.classList.remove('hidden');
            if (treeView) treeView.innerHTML = '';
        } else {
            if (noFiles) noFiles.classList.add('hidden');
            buildTreeStructure(subjects);

            if (expandedSubjects.length > 0) {
                setTimeout(() => {
                    expandedSubjects.forEach(subjectName => {
                        delete state.subjectFiles[subjectName];
                        const subjects = document.querySelectorAll('.tree-subject');
                        subjects.forEach(subjectDiv => {
                            if (subjectDiv.dataset.subject === subjectName) {
                                const subjectHeader = subjectDiv.querySelector('.subject-header');
                                if (subjectHeader) {
                                    window.toggleSubject(subjectHeader, subjectName);
                                }
                            }
                        });
                    });
                }, 100);
            }
        }
    } catch (error) {
        if (loading) loading.classList.add('hidden');
        if (treeView) treeView.innerHTML = '<p class="error">Failed to load files</p>';
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
        console.error('Failed to load stats:', error);
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
        expandSubjectFromRoute();
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
    const header = event.target.closest('.subject-header');
    if (header && header.dataset.subjectName && !event.target.closest('.favorite-star')) {
        window.toggleSubject(header, header.dataset.subjectName);
        return;
    }

    const star = event.target.closest('.favorite-star');
    if (star && star.dataset.subjectName) {
        window.toggleFavorite(star.dataset.subjectName, event);
        return;
    }

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

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    window.loadDashboard();
});
