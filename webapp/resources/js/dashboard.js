/**
 * Dashboard Main - JavaScript Module
 * Handles file tree, favorites, search, and main dashboard functionality
 */

import { renderSubjectProfile } from './subject-profile-renderer.js';

// Global state
let allFiles = [];
let subjectFiles = {}; // Cache for loaded subject files
let favorites = [];

// Route parameters - will be set by blade template
window.dashboardRouteParams = window.dashboardRouteParams || {};

/**
 * Check authentication
 */
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
        return;
    }
}

/**
 * Load all dashboard data
 */
window.loadDashboard = async function() {
    // Load favorites FIRST before building the tree
    // This ensures favorites are available when sorting and rendering stars
    await loadFavorites();

    // Then load files and stats in parallel
    await Promise.all([
        loadFiles(),
        loadStats()
    ]);

    // Handle route parameters after data is loaded
    const routeParams = window.dashboardRouteParams;
    if (routeParams.searchQuery) {
        performSearchFromRoute();
    } else if (routeParams.profileSubject) {
        if (typeof window.viewSubjectProfile === 'function') {
            window.viewSubjectProfile(routeParams.profileSubject, { stopPropagation: () => {} });
        }
    } else if (routeParams.filterUserId) {
        filterByOwnerFromRoute();
    } else if (routeParams.selectedSubject) {
        expandSubjectFromRoute();
    }
}

/**
 * Load favorites
 */
async function loadFavorites() {
    try {
        const response = await fetchAPI('/api/favorites');
        favorites = response.favorites || [];
        updateFavoriteCount();
    } catch (error) {
        console.error('Failed to load favorites:', error);
        favorites = [];
    }
}

/**
 * Update favorite count badge
 */
function updateFavoriteCount() {
    const elem = document.getElementById('favoriteCount');
    if (elem) {
        elem.textContent = favorites.length;
    }
}

/**
 * Check if subject is favorite
 */
function isFavorite(subjectName) {
    return favorites.some(f => f.subject_name === subjectName);
}

/**
 * Wrapper function to safely get subject name from data attribute and toggle favorite
 */
window.toggleFavoriteByElement = async function(element, event) {
    const subjectRow = element.closest('.tree-subject');
    if (subjectRow) {
        const subjectNameJSON = subjectRow.getAttribute('data-subject-name');
        if (subjectNameJSON) {
            try {
                const subjectName = JSON.parse(subjectNameJSON);
                await window.toggleFavorite(subjectName, event);
            } catch (e) {
                console.error('Failed to parse subject name:', e);
            }
        }
    }
};

/**
 * Toggle favorite status
 */
window.toggleFavorite = async function(subjectName, event) {
    event.stopPropagation();

    const favorite = favorites.find(f => f.subject_name === subjectName);
    const isRemoving = !!favorite;
    const starElement = event.currentTarget;

    // Add pop animation
    starElement.classList.add('animating');
    setTimeout(() => starElement.classList.remove('animating'), 300);

    // Optimistic update - update star icon immediately
    if (isRemoving) {
        starElement.textContent = '☆';
        starElement.classList.remove('active');
        starElement.title = 'Add to favorites';
        favorites = favorites.filter(f => f.id !== favorite.id);
    } else {
        starElement.textContent = '★';
        starElement.classList.add('active');
        starElement.title = 'Remove from favorites';
        favorites.push({ id: -1, subject_name: subjectName });
    }

    // Update counter instantly
    updateFavoriteCount();

    // Make API call in background
    try {
        if (isRemoving) {
            await fetchAPI(`/api/favorites/${favorite.id}`, { method: 'DELETE' });
        } else {
            const response = await fetchAPI('/api/favorites', {
                method: 'POST',
                body: JSON.stringify({ subject_name: subjectName })
            });
            // Replace temporary favorite with real one
            favorites = favorites.filter(f => f.subject_name !== subjectName);
            favorites.push(response.favorite);
        }

        // Rebuild tree after API call succeeds (to reorder subjects)
        buildTreeStructure(allFiles);
    } catch (error) {
        // Revert star icon on error
        if (isRemoving) {
            starElement.textContent = '★';
            starElement.classList.add('active');
            starElement.title = 'Remove from favorites';
            favorites.push(favorite);
        } else {
            starElement.textContent = '☆';
            starElement.classList.remove('active');
            starElement.title = 'Add to favorites';
            favorites = favorites.filter(f => f.subject_name !== subjectName);
        }
        updateFavoriteCount();
        alert('Failed to update favorite');
    }
}

/**
 * Load files
 */
async function loadFiles() {
    const loading = document.getElementById('loadingFiles');
    const noFiles = document.getElementById('noFiles');
    const treeView = document.getElementById('treeView');

    if (loading) loading.classList.remove('hidden');

    // Track currently expanded subjects before rebuilding
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
        // Load only subjects with file counts - much faster!
        const response = await fetchAPI('/api/subjects?with_counts=true');
        const subjects = response.subjects || [];

        // Store subjects in allFiles for favorites toggle to work
        allFiles = subjects;

        if (loading) loading.classList.add('hidden');

        if (subjects.length === 0) {
            if (noFiles) noFiles.classList.remove('hidden');
            if (treeView) treeView.innerHTML = '';
        } else {
            if (noFiles) noFiles.classList.add('hidden');
            buildTreeStructure(subjects);

            // Re-expand previously expanded subjects after a short delay
            if (expandedSubjects.length > 0) {
                setTimeout(() => {
                    expandedSubjects.forEach(subjectName => {
                        // Clear cache to force fresh data load
                        delete subjectFiles[subjectName];

                        // Find and expand the subject
                        const subjects = document.querySelectorAll('.tree-subject');
                        subjects.forEach(subjectDiv => {
                            try {
                                const storedName = JSON.parse(subjectDiv.dataset.subjectName || '""');
                                if (storedName === subjectName) {
                                    const subjectHeader = subjectDiv.querySelector('.subject-header');
                                    if (subjectHeader) {
                                        window.toggleSubject(subjectHeader, subjectName);
                                    }
                                }
                            } catch (e) {
                                // Ignore parse errors
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

/**
 * Build tree structure
 */
function buildTreeStructure(subjects) {
    const treeView = document.getElementById('treeView');
    if (!treeView) return;

    let html = '';

    // Sort subjects: favorites first, then alphabetically
    const sortedSubjects = subjects.sort((a, b) => {
        const aFav = isFavorite(a.subject_name);
        const bFav = isFavorite(b.subject_name);

        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
        return a.subject_name.localeCompare(b.subject_name);
    });

    sortedSubjects.forEach(subject => {
        const subjectName = subject.subject_name;
        const totalFiles = subject.file_count;
        const isFav = isFavorite(subjectName);

        // Escape subject name for safe HTML display
        const subjectNameEscaped = escapeHtml(subjectName);
        // JSON encode for safe storage in data attribute (avoids HTML entity decode issues)
        const subjectNameData = escapeHtml(JSON.stringify(subjectName));

        html += `
            <div class="tree-subject glass-subject subject-row" data-subject-name="${subjectNameData}">
                <div class="subject-header" onclick="toggleSubjectByElement(this)">
                    <div class="subject-title">
                        <span class="subject-icon">▶</span>
                        <span class="subject-name name">${subjectNameEscaped}</span>
                        <span class="favorite-star star-icon ${isFav ? 'active' : ''}"
                              onclick="toggleFavoriteByElement(this, event)"
                              title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">
                            ${isFav ? '★' : '☆'}
                        </span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <span class="subject-count file-count count">${totalFiles} files</span>
                    </div>
                </div>
                <div class="subject-categories files-container file-list">
                    <div class="loading" style="padding: 1rem;">Loading categories...</div>
                </div>
            </div>
        `;
    });

    // Set innerHTML directly - content is already escaped via escapeHtml()
    treeView.innerHTML = html;
}

/**
 * Build subject tabs HTML with profile + categories
 */
function buildSubjectTabsHTML(categories, subjectName, profile) {
    const categoryOrder = ['Prednasky', 'Otazky', 'Materialy', 'Seminare'];
    const subjectId = subjectName.replace(/[^a-zA-Z0-9]/g, '_');

    // Build tab navigation - Profile tab + 4 category tabs
    let tabNavHTML = '<div class="tab-nav">';

    // Profile tab button
    tabNavHTML += `
        <button class="tab-btn active" onclick="switchTab(event, '${subjectId}', 'Profile')">
            <span>ℹ️</span>
            <span>Profile</span>
        </button>
    `;

    // Category tab buttons
    categoryOrder.forEach((categoryName) => {
        const files = categories[categoryName] || [];
        const fileCount = files.length;
        const categoryIcon = {
            'Prednasky': '📚',
            'Otazky': '❓',
            'Materialy': '📄',
            'Seminare': '👥'
        }[categoryName] || '📁';

        tabNavHTML += `
            <button class="tab-btn" onclick="switchTab(event, '${subjectId}', '${categoryName}')">
                <span>${categoryIcon}</span>
                <span>${categoryName}</span>
                <span class="category-count">${fileCount}</span>
            </button>
        `;
    });
    tabNavHTML += '</div>';

    // Build tab content - Profile content + 4 category contents
    let tabContentHTML = '';

    // Profile tab content - use shared renderer
    const profileHTML = renderSubjectProfile(subjectName, profile, 'profile-container');

    tabContentHTML += `
        <div class="tab-content active" id="tab-${subjectId}-Profile">
            ${profileHTML}
        </div>
    `;

    // Category tab contents
    categoryOrder.forEach((categoryName) => {
        const files = categories[categoryName] || [];
        const fileCount = files.length;

        // Escape subject name for safe display in data attribute
        const subjectNameEscaped = escapeHtml(subjectName);
        const categoryNameEscaped = escapeHtml(categoryName);

        tabContentHTML += `
            <div class="tab-content" id="tab-${subjectId}-${categoryName}">
                <button class="upload-btn-category upload-button" id="uploadFileBtn" data-subject="${subjectNameEscaped}" data-category="${categoryNameEscaped}" onclick="openUploadModalByElement(this)">
                    📤 Upload to ${categoryNameEscaped}
                </button>
                <div class="file-list">
                    ${fileCount > 0 ? buildFilesHTML(files) : '<p style="padding: 1rem; color: var(--text-secondary); font-style: italic;">No files in this category yet.</p>'}
                </div>
            </div>
        `;
    });

    // Return HTML - content is already escaped
    return `<div class="tab-container">${tabNavHTML}${tabContentHTML}</div>`;
}

/**
 * Build files HTML list
 */
function buildFilesHTML(files) {
    let html = '';
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const currentUserId = currentUser.id;

    files.forEach(file => {
        // Handle both 'id' (from DB) and 'file_id' (from Elasticsearch)
        const fileId = file.id || file.file_id;
        const fileIcon = getFileIcon(file.file_extension);
        const fileSize = formatBytes(file.file_size);
        const date = new Date(file.created_at).toLocaleDateString();
        const canDelete = (file.user_id === currentUserId);
        const ownerName = file.user ? file.user.name : 'Unknown';
        const ownerId = file.user ? file.user.id : null;

        // Escape all user-generated content
        const filenameEscaped = escapeHtml(file.original_filename);
        const ownerNameEscaped = escapeHtml(ownerName);
        const extensionEscaped = escapeHtml(file.file_extension.toUpperCase());

        html += `
            <div class="file-item glass-file-item">
                <div class="file-item-info">
                    <div class="file-item-icon">${fileIcon}</div>
                    <div class="file-item-details">
                        <h4>${filenameEscaped}</h4>
                        <div class="file-item-meta">
                            ${fileSize} • ${extensionEscaped} • ${date}
                            ${ownerId ? ` • <a href="#" data-user-id="${ownerId}" data-user-name="${ownerNameEscaped}" onclick="filterByOwnerByElement(this, event)" style="color: var(--primary-color); text-decoration: none; font-weight: 600;">👤 ${ownerNameEscaped}</a>` : ''}
                        </div>
                    </div>
                </div>
                <div class="file-item-actions">
                    <button class="btn btn-primary btn-small download-btn" data-file-id="${fileId}" data-filename="${escapeHtml(file.original_filename)}">
                        ⬇ Download
                    </button>
                    ${canDelete ? `
                        <button class="btn btn-danger btn-small delete-btn" data-file-id="${fileId}">
                            🗑️ Delete
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    });

    // Return escaped HTML - already safe via escapeHtml()
    return html;
}

/**
 * Wrapper function to safely get user data from element and filter by owner
 */
window.filterByOwnerByElement = function(element, event) {
    const userId = element.getAttribute('data-user-id');
    const userName = element.getAttribute('data-user-name');
    if (userId && userName) {
        window.filterByOwner(parseInt(userId), userName, event);
    }
};

/**
 * Filter files by owner
 */
window.filterByOwner = function(userId, userName, event) {
    if (event) event.preventDefault();
    window.location.href = `/dashboard/user/${userId}/${encodeURIComponent(userName)}`;
}

/**
 * Filter by owner from route parameters
 */
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

        // Rebuild tree with filtered files
        buildTreeStructure(files);

        // Show notification with back link
        const notification = document.createElement('div');
        notification.className = 'alert alert-success';
        notification.style.position = 'fixed';
        notification.style.top = '80px';
        notification.style.right = '20px';
        notification.style.zIndex = '3000';
        // Escape user name for safe display
        const userNameEscaped = escapeHtml(routeParams.filterUserName);

        notification.innerHTML = `
            Showing files by ${userNameEscaped} (${files.length} files)
            <a href="/dashboard" style="margin-left: 1rem; padding: 0.25rem 0.75rem; border: none; background: white; color: var(--primary-color); border-radius: var(--radius-sm); cursor: pointer; font-weight: 600; text-decoration: none; display: inline-block;">
                ✕ Clear Filter
            </a>
        `;
        document.body.appendChild(notification);
    } catch (error) {
        if (loading) loading.classList.add('hidden');
        if (treeView) treeView.style.display = 'block';
        console.error('Failed to filter by owner:', error);
    }
}

/**
 * Reload files for a specific subject (called after file upload)
 * This keeps the subject expanded and shows new files without collapsing the tree
 */
window.reloadSubjectFiles = async function(subjectName) {
    console.log('Reloading files for subject:', subjectName);

    // Clear cached files for this subject to force fresh data
    delete subjectFiles[subjectName];

    // Find the subject element
    const subjectElements = document.querySelectorAll('.tree-subject');
    let targetSubject = null;

    subjectElements.forEach(subjectDiv => {
        try {
            const storedName = JSON.parse(subjectDiv.dataset.subjectName || '""');
            if (storedName === subjectName) {
                targetSubject = subjectDiv;
            }
        } catch (e) {
            // Ignore parse errors
        }
    });

    if (!targetSubject) {
        console.warn('Subject not found in tree, reloading entire dashboard');
        if (typeof loadDashboard === 'function') {
            loadDashboard();
        }
        return;
    }

    // Find the subject header and categories container
    const subjectHeader = targetSubject.querySelector('.subject-header');
    const categories = targetSubject.querySelector('.subject-categories');
    const icon = subjectHeader?.querySelector('.subject-icon');

    if (!subjectHeader || !categories || !icon) {
        console.warn('Subject structure incomplete, reloading entire dashboard');
        if (typeof loadDashboard === 'function') {
            loadDashboard();
        }
        return;
    }

    // Check if subject is currently expanded
    const wasExpanded = icon.classList.contains('expanded');

    if (!wasExpanded) {
        // If collapsed, just clear the cache (will reload when user expands)
        return;
    }

    // Subject is expanded, reload its files
    categories.innerHTML = '<div class="loading" style="padding: 1rem;">Refreshing files...</div>';

    try {
        // Check if this subject has a profile
        const subject = allFiles.find(s => s.subject_name === subjectName);
        const hasProfile = subject?.has_profile || false;

        // Load files and profile in parallel
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

        // Update cache
        subjectFiles[subjectName] = files;

        // Build categories structure
        const tree = {};
        files.forEach(file => {
            if (!tree[file.category]) {
                tree[file.category] = [];
            }
            tree[file.category].push(file);
        });

        // Rebuild tabs HTML
        categories.innerHTML = buildSubjectTabsHTML(tree, subjectName, profile);

        console.log('Subject files reloaded successfully');

        // Also update the file count in the subject header
        const fileCountSpan = subjectHeader.querySelector('.subject-count');
        if (fileCountSpan) {
            fileCountSpan.textContent = `${files.length} files`;
        }

        // Update global stats as well
        loadStats();

    } catch (error) {
        console.error('Failed to reload subject files:', error);
        categories.innerHTML = '<p class="error" style="padding: 1rem;">Failed to refresh files</p>';
    }
}

/**
 * Wrapper function to safely get subject name from data attribute and toggle subject
 */
window.toggleSubjectByElement = async function(element) {
    const subjectRow = element.closest('.tree-subject');
    if (subjectRow) {
        const subjectNameJSON = subjectRow.getAttribute('data-subject-name');
        if (subjectNameJSON) {
            try {
                const subjectName = JSON.parse(subjectNameJSON);
                await window.toggleSubject(element, subjectName);
            } catch (e) {
                console.error('Failed to parse subject name:', e);
            }
        }
    }
};

/**
 * Toggle subject expansion
 */
window.toggleSubject = async function(element, subjectName) {
    const icon = element.querySelector('.subject-icon');
    const categories = element.nextElementSibling;

    const isExpanded = icon.classList.contains('expanded');

    if (isExpanded) {
        // Just collapse
        icon.classList.remove('expanded');
        categories.classList.remove('expanded');
    } else {
        // Expand and load files if not already loaded
        icon.classList.add('expanded');
        categories.classList.add('expanded');

        // Check if we've already loaded files for this subject
        if (!subjectFiles[subjectName]) {
            categories.innerHTML = '<div class="loading" style="padding: 1rem;">Loading files and profile...</div>';

            try {
                // Check if this subject has a profile (to avoid 404 console errors)
                const subject = allFiles.find(s => s.subject_name === subjectName);
                const hasProfile = subject?.has_profile || false;

                // Load files and profile in parallel (only fetch profile if it exists)
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

                // Cache the files
                subjectFiles[subjectName] = files;

                // Build categories structure
                const tree = {};
                files.forEach(file => {
                    if (!tree[file.category]) {
                        tree[file.category] = [];
                    }
                    tree[file.category].push(file);
                });

                // Build and render tabs with profile + categories HTML
                categories.innerHTML = buildSubjectTabsHTML(tree, subjectName, profile);
            } catch (error) {
                categories.innerHTML = '<p class="error" style="padding: 1rem;">Failed to load files</p>';
            }
        }
    }
}

/**
 * Switch between tabs
 */
window.switchTab = function(event, subjectId, tabName) {
    // Prevent event propagation
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    console.log('Switching tab:', subjectId, tabName);

    // Get all tab buttons and contents for this subject
    const clickedButton = event.target.closest('.tab-btn');
    if (!clickedButton) {
        console.error('Tab button not found');
        return;
    }

    const tabContainer = clickedButton.closest('.tab-container');
    if (!tabContainer) {
        console.error('Tab container not found');
        return;
    }

    const tabButtons = tabContainer.querySelectorAll('.tab-btn');
    const tabContents = tabContainer.querySelectorAll('.tab-content');

    console.log('Found', tabButtons.length, 'buttons and', tabContents.length, 'contents');

    // Remove active class from all tabs
    tabButtons.forEach(btn => btn.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));

    // Add active class to clicked button
    clickedButton.classList.add('active');

    // Show corresponding content
    const targetContent = document.getElementById(`tab-${subjectId}-${tabName}`);
    console.log('Target content ID:', `tab-${subjectId}-${tabName}`, 'Found:', !!targetContent);

    if (targetContent) {
        targetContent.classList.add('active');
        console.log('Activated tab content for:', tabName);
    } else {
        console.error('Tab content not found for:', `tab-${subjectId}-${tabName}`);
    }
}

/**
 * Perform search from route
 */
async function performSearchFromRoute() {
    const routeParams = window.dashboardRouteParams;
    const query = routeParams.searchQuery;
    const searchInContent = document.getElementById('searchInContent')?.checked ?? true;
    const searchInFilename = document.getElementById('searchInFilename')?.checked ?? true;

    if (!query) {
        return;
    }

    try {
        const response = await fetchAPI(`/api/search?q=${encodeURIComponent(query)}&size=100`);
        const results = response.results || [];

        console.log(`Search returned ${results.length} results`);

        // Filter results based on user preferences
        let filteredResults = results;
        if (!searchInContent && !searchInFilename) {
            filteredResults = [];
        } else if (!searchInContent && searchInFilename) {
            filteredResults = results.filter(r =>
                r.source.filename.toLowerCase().includes(query.toLowerCase()) ||
                r.source.original_filename.toLowerCase().includes(query.toLowerCase())
            );
        }

        console.log(`After filtering: ${filteredResults.length} results`);

        searchMode = true;
        const treeView = document.getElementById('treeView');
        const searchResults = document.getElementById('searchResults');
        const searchCount = document.getElementById('searchCount');

        if (treeView) treeView.style.display = 'none';
        if (searchResults) searchResults.classList.remove('hidden');
        if (searchCount) searchCount.textContent = filteredResults.length;

        displaySearchResults(filteredResults, query);
    } catch (error) {
        console.error('Search error:', error);
        alert('Search failed: ' + error.message);
    }
}

/**
 * Expand subject from route
 */
function expandSubjectFromRoute() {
    const routeParams = window.dashboardRouteParams;
    // Find and expand the subject
    setTimeout(() => {
        const subjects = document.querySelectorAll('.subject-header');
        subjects.forEach(subjectHeader => {
            const titleSpan = subjectHeader.querySelector('.subject-title span:nth-child(2)');
            if (titleSpan && titleSpan.textContent === routeParams.selectedSubject) {
                // Click to expand
                window.toggleSubject(subjectHeader, routeParams.selectedSubject);
            }
        });
    }, 100);
}

/**
 * Display search results
 */
function displaySearchResults(results, query) {
    const grid = document.getElementById('searchResultsGrid');
    if (!grid) return;

    if (results.length === 0) {
        grid.innerHTML = '<p class="empty-state">No results found</p>';
        return;
    }

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const currentUserId = currentUser.id;

    let html = '';
    results.forEach(result => {
        const file = result.source;
        const score = result.score || 0;
        const fileIcon = getFileIcon(file.file_extension);
        const fileSize = formatBytes(file.file_size);
        const canDelete = (file.user_id === currentUserId);

        // Escape all user-generated content
        const filenameEscaped = escapeHtml(file.original_filename);
        const subjectNameEscaped = escapeHtml(file.subject_name);
        const categoryEscaped = escapeHtml(file.category);
        const extensionEscaped = escapeHtml(file.file_extension.toUpperCase());

        // Determine match quality
        let scoreClass = 'low';
        let scoreLabel = 'Match';
        if (score > 5) {
            scoreClass = 'high';
            scoreLabel = 'Excellent Match';
        } else if (score > 2) {
            scoreClass = 'medium';
            scoreLabel = 'Good Match';
        }

        // Get highlight snippet - ESCAPE THIS CRITICAL!
        let highlightHTML = '';
        if (result.highlight && result.highlight.content && result.highlight.content.length > 0) {
            const highlightEscaped = escapeHtml(result.highlight.content[0]);
            highlightHTML = `
                <div class="search-highlight">
                    💡 "${highlightEscaped}"
                </div>
            `;
        }

        html += `
            <div class="search-result-item glass-search-result">
                <div class="search-result-header">
                    <div class="search-result-info">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <span style="font-size: 2rem;">${fileIcon}</span>
                            <div>
                                <div class="search-result-filename">${filenameEscaped}</div>
                                <div class="search-result-meta">
                                    <span class="badge">${subjectNameEscaped}</span>
                                    <span class="badge">${categoryEscaped}</span>
                                    <span>${fileSize}</span>
                                    <span>${extensionEscaped}</span>
                                </div>
                            </div>
                        </div>
                        ${highlightHTML}
                    </div>
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <span class="match-score ${scoreClass}" title="Relevance Score: ${score.toFixed(2)}">
                            ${scoreLabel} (${score.toFixed(1)})
                        </span>
                        <button class="btn btn-primary btn-small download-btn" data-file-id="${file.file_id}" data-filename="${escapeHtml(file.original_filename)}">
                            ⬇ Download
                        </button>
                        ${canDelete ? `
                            <button class="btn btn-danger btn-small delete-btn" data-file-id="${file.file_id}">
                                🗑️ Delete
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    });

    grid.innerHTML = html;
}

/**
 * Get file icon by extension
 */
function getFileIcon(extension) {
    const icons = {
        'pdf': '📕',
        'doc': '📘',
        'docx': '📘',
        'ppt': '📊',
        'pptx': '📊',
        'txt': '📝'
    };
    return icons[extension.toLowerCase()] || '📄';
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Load dashboard stats
 */
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

        // Update favorite count from global favorites array
        if (favoriteCount) {
            favoriteCount.textContent = favorites.length || 0;
        }
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

/**
 * Download file
 */
window.downloadFile = async function(fileId, filename) {
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
}

/**
 * Delete file
 */
window.deleteFile = async function(fileId) {
    if (!confirm('Are you sure you want to delete this file?')) {
        return;
    }

    try {
        // Find which subject this file belongs to before deleting
        let fileSubject = null;

        // Search through cached subject files to find the subject
        for (const [subjectName, files] of Object.entries(subjectFiles)) {
            if (files.some(f => (f.id || f.file_id) === fileId)) {
                fileSubject = subjectName;
                break;
            }
        }

        // Delete the file
        await fetchAPI(`/api/files/${fileId}`, { method: 'DELETE' });

        // Reload only the affected subject if we found it
        if (fileSubject && typeof window.reloadSubjectFiles === 'function') {
            await window.reloadSubjectFiles(fileSubject);
        } else {
            // Fallback: reload entire dashboard if we can't find the subject
            window.loadDashboard();
        }
    } catch (error) {
        alert('Failed to delete file');
    }
}

/**
 * Fetch API wrapper with auth
 */
window.fetchAPI = async function(url, options = {}) {
    const token = localStorage.getItem('token');

    console.log('fetchAPI called:', url);

    const response = await fetch(url, {
        ...options,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            ...options.headers
        }
    });

    console.log('Response status:', response.status);

    if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        throw new Error('Unauthorized');
    }

    const data = await response.json();
    console.log('Response data:', data);
    return data;
}

// Event delegation for download and delete buttons
document.addEventListener('click', (event) => {
    // Handle download button clicks
    if (event.target.closest('.download-btn')) {
        const button = event.target.closest('.download-btn');
        const fileId = button.dataset.fileId;
        const filename = button.dataset.filename;
        if (fileId && filename) {
            window.downloadFile(parseInt(fileId), filename);
        }
    }

    // Handle delete button clicks
    if (event.target.closest('.delete-btn')) {
        const button = event.target.closest('.delete-btn');
        const fileId = button.dataset.fileId;
        if (fileId) {
            window.deleteFile(parseInt(fileId));
        }
    }
});

// Initialize dashboard on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    window.loadDashboard();
});
