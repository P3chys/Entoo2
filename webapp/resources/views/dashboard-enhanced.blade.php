@extends('layouts.app')

@section('title', 'Dashboard - Entoo')

@section('content')
<div class="dashboard-container">
    <div class="container">
        <x-search :searchQuery="$searchQuery ?? null" />
        <x-file-tree />
        <x-file-upload />
    </div>
</div>

<!-- Upload Modal (for category-level upload) -->


<!-- Subject Profile Modal -->
<div id="subjectProfileModal" class="modal hidden">
    <div class="modal-content" style="max-width: 700px;">
        <div class="modal-header">
            <h2>📋 Subject Profile</h2>
            <button onclick="closeSubjectProfileModal()" class="close-btn">&times;</button>
        </div>

        <div id="subjectProfileContent">
            <div class="loading">Loading profile...</div>
        </div>

        <div id="subjectProfileForm" class="hidden">
            <form onsubmit="saveSubjectProfile(event)">
                <input type="hidden" id="profileSubjectName">

                <div class="form-group">
                    <label for="profileDescription">Description</label>
                    <textarea id="profileDescription" name="description" rows="3"
                              placeholder="Brief description of the subject"></textarea>
                </div>

                <div class="form-group">
                    <label for="profileProfessor">Professor Name</label>
                    <input type="text" id="profileProfessor" name="professor_name"
                           placeholder="e.g., Dr. John Smith">
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="form-group">
                        <label for="profileCourseCode">Course Code</label>
                        <input type="text" id="profileCourseCode" name="course_code"
                               placeholder="e.g., CS101">
                    </div>

                    <div class="form-group">
                        <label for="profileCredits">Credits</label>
                        <input type="number" id="profileCredits" name="credits" min="1" max="20"
                               placeholder="e.g., 3">
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="form-group">
                        <label for="profileSemester">Semester</label>
                        <select id="profileSemester" name="semester">
                            <option value="">Select semester</option>
                            <option value="Winter">Winter</option>
                            <option value="Summer">Summer</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="profileYear">Year</label>
                        <input type="number" id="profileYear" name="year" min="2020" max="2030"
                               placeholder="e.g., 2024">
                    </div>
                </div>

                <div class="form-group">
                    <label for="profileColor">Color Theme</label>
                    <input type="color" id="profileColor" name="color" value="#667eea">
                    <small>Choose a color to identify this subject</small>
                </div>

                <div class="form-group">
                    <label for="profileNotes">Additional Notes</label>
                    <textarea id="profileNotes" name="notes" rows="3"
                              placeholder="Any additional information"></textarea>
                </div>

                <div class="modal-footer">
                    <button type="button" onclick="closeSubjectProfileModal()" class="btn btn-secondary">Cancel</button>
                    <button type="submit" class="btn btn-primary">💾 Save Profile</button>
                </div>
            </form>
        </div>
    </div>
</div>

<!-- All styles now in /css/app.css -->

<script>
// Global state
let allFiles = [];
let subjectFiles = {}; // Cache for loaded subject files
let favorites = [];
let searchMode = false;

// Route parameters from Laravel
const routeParams = {
    selectedSubject: @json($selectedSubject ?? null),
    searchQuery: @json($searchQuery ?? null),
    profileSubject: @json($profileSubject ?? null),
    filterUserId: @json($filterUserId ?? null),
    filterUserName: @json($filterUserName ?? null)
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadDashboard();
});

function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
        return;
    }
}

// Make loadDashboard globally accessible for file upload callback
window.loadDashboard = async function loadDashboard() {
    await Promise.all([
        loadFavorites(),
        loadFiles(),
        loadStats()
    ]);

    // Handle route parameters after data is loaded
    if (routeParams.searchQuery) {
        performSearchFromRoute();
    } else if (routeParams.profileSubject) {
        viewSubjectProfile(routeParams.profileSubject, { stopPropagation: () => {} });
    } else if (routeParams.filterUserId) {
        filterByOwnerFromRoute();
    } else if (routeParams.selectedSubject) {
        expandSubjectFromRoute();
    }
}

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

function updateFavoriteCount() {
    document.getElementById('favoriteCount').textContent = favorites.length;
}

function isFavorite(subjectName) {
    return favorites.some(f => f.subject_name === subjectName);
}

async function toggleFavorite(subjectName, event) {
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
        starElement.textContent = '⭐';
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
            starElement.textContent = '⭐';
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

async function loadFiles() {
    const loading = document.getElementById('loadingFiles');
    const noFiles = document.getElementById('noFiles');
    const treeView = document.getElementById('treeView');

    loading.classList.remove('hidden');

    try {
        // Load only subjects with file counts - much faster!
        const response = await fetchAPI('/api/subjects?with_counts=true');
        const subjects = response.subjects || [];

        loading.classList.add('hidden');

        if (subjects.length === 0) {
            noFiles.classList.remove('hidden');
            treeView.innerHTML = '';
        } else {
            noFiles.classList.add('hidden');
            buildTreeStructure(subjects);
        }
    } catch (error) {
        loading.classList.add('hidden');
        treeView.innerHTML = '<p class="error">Failed to load files</p>';
    }
}

function buildTreeStructure(subjects) {
    const treeView = document.getElementById('treeView');
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

        html += `
            <div class="tree-subject" data-subject="${subjectName}">
                <div class="subject-header" onclick="toggleSubject(this, '${subjectName.replace(/'/g, "\\'")}')">
                    <div class="subject-title">
                        <span class="subject-icon">▶</span>
                        <span>${subjectName}</span>
                        <span class="favorite-star ${isFav ? 'active' : ''}"
                              onclick="toggleFavorite('${subjectName.replace(/'/g, "\\'")}', event)"
                              title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">
                            ${isFav ? '⭐' : '☆'}
                        </span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <span class="subject-count">${totalFiles} files</span>
                    </div>
                </div>
                <div class="subject-categories">
                    <div class="loading" style="padding: 1rem;">Loading categories...</div>
                </div>
            </div>
        `;
    });

    treeView.innerHTML = html;
}

function buildSubjectTabsHTML(categories, subjectName, profile) {
    const categoryOrder = ['Prednasky', 'Otazky', 'Materialy', 'Seminare'];
    const subjectId = subjectName.replace(/[^a-zA-Z0-9]/g, '_');
    const token = localStorage.getItem('token');

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

    // Profile tab content
    let profileHTML = '';
    if (!profile) {
        profileHTML = `
            <div style="padding: 1rem; background: rgba(255, 255, 255, 0.5); border-radius: var(--radius-md);">
                <p style="color: var(--text-secondary); margin-bottom: 1rem;">
                    No profile information available for <strong>${subjectName}</strong>
                </p>
                ${token ? `
                    <button onclick="openProfileEditModal('${subjectName.replace(/'/g, "\\'")}', null)" class="btn btn-primary btn-small">
                        ✏️ Create Profile
                    </button>
                ` : '<p style="color: var(--text-secondary); font-size: 0.9rem;">Login to create a profile</p>'}
            </div>
        `;
    } else {
        profileHTML = `
            <div style="padding: 1rem; background: rgba(255, 255, 255, 0.5); border-radius: var(--radius-md);">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                    <h3 style="margin: 0; color: var(--primary-color); font-size: 1.1rem;">${subjectName}</h3>
                    ${token ? `
                        <button onclick='openProfileEditModal(${JSON.stringify(subjectName)}, ${JSON.stringify(profile)})' class="btn btn-primary btn-small">
                            ✏️ Edit Profile
                        </button>
                    ` : ''}
                </div>

                ${profile.description ? `
                    <div style="margin-bottom: 1rem;">
                        <strong style="color: var(--text-secondary); font-size: 0.9rem;">Description:</strong>
                        <p style="margin: 0.5rem 0 0 0;">${profile.description}</p>
                    </div>
                ` : ''}

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
                    ${profile.professor_name ? `
                        <div>
                            <strong style="color: var(--text-secondary); font-size: 0.9rem;">Professor:</strong>
                            <p style="margin: 0.25rem 0 0 0;">${profile.professor_name}</p>
                        </div>
                    ` : ''}

                    ${profile.course_code ? `
                        <div>
                            <strong style="color: var(--text-secondary); font-size: 0.9rem;">Course Code:</strong>
                            <p style="margin: 0.25rem 0 0 0;">${profile.course_code}</p>
                        </div>
                    ` : ''}

                    ${profile.semester || profile.year ? `
                        <div>
                            <strong style="color: var(--text-secondary); font-size: 0.9rem;">Semester:</strong>
                            <p style="margin: 0.25rem 0 0 0;">${profile.semester || ''} ${profile.year || ''}</p>
                        </div>
                    ` : ''}

                    ${profile.credits ? `
                        <div>
                            <strong style="color: var(--text-secondary); font-size: 0.9rem;">Credits:</strong>
                            <p style="margin: 0.25rem 0 0 0;">${profile.credits}</p>
                        </div>
                    ` : ''}
                </div>

                ${profile.notes ? `
                    <div style="margin-bottom: 1rem;">
                        <strong style="color: var(--text-secondary); font-size: 0.9rem;">Notes:</strong>
                        <p style="margin: 0.5rem 0 0 0; color: var(--text-secondary);">${profile.notes}</p>
                    </div>
                ` : ''}
            </div>
        `;
    }

    tabContentHTML += `
        <div class="tab-content active" id="tab-${subjectId}-Profile">
            ${profileHTML}
        </div>
    `;

    // Category tab contents
    categoryOrder.forEach((categoryName) => {
        const files = categories[categoryName] || [];
        const fileCount = files.length;

        tabContentHTML += `
            <div class="tab-content" id="tab-${subjectId}-${categoryName}">
                <button class="upload-btn-category" onclick="openUploadModal('${subjectName.replace(/'/g, "\\'")}', '${categoryName}', event)">
                    📤 Upload to ${categoryName}
                </button>
                <div class="file-list">
                    ${fileCount > 0 ? buildFilesHTML(files) : '<p style="padding: 1rem; color: var(--text-secondary); font-style: italic;">No files in this category yet.</p>'}
                </div>
            </div>
        `;
    });

    return `<div class="tab-container">${tabNavHTML}${tabContentHTML}</div>`;
}

function buildCategoriesHTML(categories, subjectName) {
    // This function is kept for backwards compatibility but is no longer used
    // Use buildSubjectTabsHTML instead
    return buildSubjectTabsHTML(categories, subjectName, null);
}

function buildFilesHTML(files) {
    let html = '';
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const currentUserId = currentUser.id;

    files.forEach(file => {
        const fileIcon = getFileIcon(file.file_extension);
        const fileSize = formatBytes(file.file_size);
        const date = new Date(file.created_at).toLocaleDateString();
        const canDelete = (file.user_id === currentUserId);
        const ownerName = file.user ? file.user.name : 'Unknown';
        const ownerId = file.user ? file.user.id : null;

        html += `
            <div class="file-item">
                <div class="file-item-info">
                    <div class="file-item-icon">${fileIcon}</div>
                    <div class="file-item-details">
                        <h4>${file.original_filename}</h4>
                        <div class="file-item-meta">
                            ${fileSize} • ${file.file_extension.toUpperCase()} • ${date}
                            ${ownerId ? ` • <a href="#" onclick="filterByOwner(${ownerId}, '${ownerName}', event)" style="color: var(--primary-color); text-decoration: none; font-weight: 600;">👤 ${ownerName}</a>` : ''}
                        </div>
                    </div>
                </div>
                <div class="file-item-actions">
                    <button onclick="downloadFile(${file.id}, '${escapeHtml(file.original_filename)}')" class="btn btn-primary btn-small">
                        ⬇ Download
                    </button>
                    ${canDelete ? `
                        <button onclick="deleteFile(${file.id})" class="btn btn-danger btn-small">
                            🗑️ Delete
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    });

    return html;
}

function filterByOwner(userId, userName, event) {
    if (event) event.preventDefault();
    // Navigate to user filter route
    window.location.href = `/dashboard/user/${userId}/${encodeURIComponent(userName)}`;
}

async function filterByOwnerFromRoute() {
    const loading = document.getElementById('loadingFiles');
    const treeView = document.getElementById('treeView');

    loading.classList.remove('hidden');
    treeView.style.display = 'none';

    try {
        const response = await fetchAPI(`/api/files?user_id=${routeParams.filterUserId}&per_page=10000`);
        const files = response.data || [];

        loading.classList.add('hidden');
        treeView.style.display = 'block';

        // Rebuild tree with filtered files
        buildTreeStructure(files);

        // Show notification with back link
        const notification = document.createElement('div');
        notification.className = 'alert alert-success';
        notification.style.position = 'fixed';
        notification.style.top = '80px';
        notification.style.right = '20px';
        notification.style.zIndex = '3000';
        notification.innerHTML = `
            Showing files by ${routeParams.filterUserName} (${files.length} files)
            <a href="/dashboard" style="margin-left: 1rem; padding: 0.25rem 0.75rem; border: none; background: white; color: var(--primary-color); border-radius: var(--radius-sm); cursor: pointer; font-weight: 600; text-decoration: none; display: inline-block;">
                ✕ Clear Filter
            </a>
        `;
        document.body.appendChild(notification);
    } catch (error) {
        loading.classList.add('hidden');
        treeView.style.display = 'block';
        console.error('Failed to filter by owner:', error);
    }
}

async function toggleSubject(element, subjectName) {
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
                // Load both files and profile in parallel
                const [filesResponse, profileResponse] = await Promise.all([
                    fetchAPI(`/api/files?subject_name=${encodeURIComponent(subjectName)}&per_page=1000`),
                    fetch(`/api/subject-profiles/${encodeURIComponent(subjectName)}`, {
                        headers: { 'Accept': 'application/json' }
                    }).catch(() => null)
                ]);

                const files = filesResponse.data || [];
                let profile = null;
                if (profileResponse && profileResponse.ok) {
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

function switchTab(event, subjectId, tabName) {
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



async function performSearchFromRoute() {
    const query = routeParams.searchQuery;
    const searchInContent = document.getElementById('searchInContent').checked;
    const searchInFilename = document.getElementById('searchInFilename').checked;

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
        document.getElementById('treeView').style.display = 'none';
        document.getElementById('searchResults').classList.remove('hidden');
        document.getElementById('searchCount').textContent = filteredResults.length;

        displaySearchResults(filteredResults, query);
    } catch (error) {
        console.error('Search error:', error);
        alert('Search failed: ' + error.message);
    }
}

function expandSubjectFromRoute() {
    // Find and expand the subject
    setTimeout(() => {
        const subjects = document.querySelectorAll('.subject-header');
        subjects.forEach(subjectHeader => {
            const titleSpan = subjectHeader.querySelector('.subject-title span:nth-child(2)');
            if (titleSpan && titleSpan.textContent === routeParams.selectedSubject) {
                // Click to expand
                toggleSubject(subjectHeader);
            }
        });
    }, 100);
}

function displaySearchResults(results, query) {
    const grid = document.getElementById('searchResultsGrid');

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

        // Get highlight snippet
        let highlightHTML = '';
        if (result.highlight && result.highlight.content && result.highlight.content.length > 0) {
            highlightHTML = `
                <div class="search-highlight">
                    💡 "${result.highlight.content[0]}"
                </div>
            `;
        }

        html += `
            <div class="search-result-item">
                <div class="search-result-header">
                    <div class="search-result-info">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <span style="font-size: 2rem;">${fileIcon}</span>
                            <div>
                                <div class="search-result-filename">${file.original_filename}</div>
                                <div class="search-result-meta">
                                    <span class="badge">${file.subject_name}</span>
                                    <span class="badge">${file.category}</span>
                                    <span>${fileSize}</span>
                                    <span>${file.file_extension.toUpperCase()}</span>
                                </div>
                            </div>
                        </div>
                        ${highlightHTML}
                    </div>
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <span class="match-score ${scoreClass}" title="Relevance Score: ${score.toFixed(2)}">
                            ${scoreLabel} (${score.toFixed(1)})
                        </span>
                        <button onclick="downloadFile(${file.file_id}, '${escapeHtml(file.original_filename)}')" class="btn btn-primary btn-small">
                            ⬇ Download
                        </button>
                        ${canDelete ? `
                            <button onclick="deleteFile(${file.file_id})" class="btn btn-danger btn-small">
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

// Search is now handled by form submission - these functions removed

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

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function loadStats() {
    try {
        const response = await fetchAPI('/api/stats');
        document.getElementById('totalFiles').textContent = response.total_files || 0;
        document.getElementById('totalSubjects').textContent = response.total_subjects || 0;
        document.getElementById('totalStorage').textContent = ((response.total_storage_bytes || 0) / (1024 * 1024)).toFixed(2) + ' MB';
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

function groupBySubject(files) {
    const grouped = {};
    files.forEach(file => {
        if (!grouped[file.subject_name]) {
            grouped[file.subject_name] = [];
        }
        grouped[file.subject_name].push(file);
    });
    return grouped;
}

async function downloadFile(fileId, filename) {
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

async function deleteFile(fileId) {
    if (!confirm('Are you sure you want to delete this file?')) {
        return;
    }

    try {
        await fetchAPI(`/api/files/${fileId}`, { method: 'DELETE' });
        loadDashboard();
    } catch (error) {
        alert('Failed to delete file');
    }
}

async function fetchAPI(url, options = {}) {
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

// Subject Profile Functions
async function viewSubjectProfile(subjectName, event) {
    if (event && event.stopPropagation) {
        event.stopPropagation();
    }

    // Get the detail panel for this subject
    const panelId = 'detail-' + subjectName.replace(/[^a-zA-Z0-9]/g, '_');
    const detailPanel = document.getElementById(panelId);

    if (!detailPanel) {
        console.error('Detail panel not found for subject:', subjectName);
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
        // Try to fetch existing profile
        const response = await fetch(`/api/subject-profiles/${encodeURIComponent(subjectName)}`, {
            headers: {
                'Accept': 'application/json'
            }
        });

        let profile = null;
        if (response.ok) {
            const data = await response.json();
            profile = data.profile;
        }

        // Display profile info in the panel
        displaySubjectProfileInPanel(detailPanel, subjectName, profile);
    } catch (error) {
        detailPanel.innerHTML = '<p class="error" style="padding: 1rem;">Failed to load profile</p>';
    }
}

function displaySubjectProfileInPanel(panel, subjectName, profile) {
    const token = localStorage.getItem('token');

    if (!profile) {
        // No profile exists - show create option
        panel.innerHTML = `
            <div style="padding: 1.5rem; background: rgba(255, 255, 255, 0.5); border-top: 1px solid var(--glass-border);">
                <p style="color: var(--text-secondary); margin-bottom: 1rem;">
                    No profile information available for <strong>${subjectName}</strong>
                </p>
                ${token ? `
                    <button onclick="openProfileEditModal('${subjectName.replace(/'/g, "\\'")}', null)" class="btn btn-primary btn-small">
                        ✏️ Create Profile
                    </button>
                ` : '<p style="color: var(--text-secondary); font-size: 0.9rem;">Login to create a profile</p>'}
            </div>
        `;
    } else {
        // Display existing profile
        panel.innerHTML = `
            <div style="padding: 1.5rem; background: rgba(255, 255, 255, 0.5); border-top: 1px solid var(--glass-border);">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                    <h3 style="margin: 0; color: var(--primary-color); font-size: 1.1rem;">${subjectName}</h3>
                    ${token ? `
                        <button onclick='openProfileEditModal(${JSON.stringify(subjectName)}, ${JSON.stringify(profile)})' class="btn btn-primary btn-small">
                            ✏️ Edit Profile
                        </button>
                    ` : ''}
                </div>

                ${profile.description ? `
                    <div style="margin-bottom: 1rem;">
                        <strong style="color: var(--text-secondary); font-size: 0.9rem;">Description:</strong>
                        <p style="margin: 0.5rem 0 0 0;">${profile.description}</p>
                    </div>
                ` : ''}

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
                    ${profile.professor_name ? `
                        <div>
                            <strong style="color: var(--text-secondary); font-size: 0.9rem;">Professor:</strong>
                            <p style="margin: 0.25rem 0 0 0;">${profile.professor_name}</p>
                        </div>
                    ` : ''}

                    ${profile.course_code ? `
                        <div>
                            <strong style="color: var(--text-secondary); font-size: 0.9rem;">Course Code:</strong>
                            <p style="margin: 0.25rem 0 0 0;">${profile.course_code}</p>
                        </div>
                    ` : ''}

                    ${profile.semester || profile.year ? `
                        <div>
                            <strong style="color: var(--text-secondary); font-size: 0.9rem;">Semester:</strong>
                            <p style="margin: 0.25rem 0 0 0;">${profile.semester || ''} ${profile.year || ''}</p>
                        </div>
                    ` : ''}

                    ${profile.credits ? `
                        <div>
                            <strong style="color: var(--text-secondary); font-size: 0.9rem;">Credits:</strong>
                            <p style="margin: 0.25rem 0 0 0;">${profile.credits}</p>
                        </div>
                    ` : ''}
                </div>

                ${profile.notes ? `
                    <div style="margin-bottom: 1rem;">
                        <strong style="color: var(--text-secondary); font-size: 0.9rem;">Notes:</strong>
                        <p style="margin: 0.5rem 0 0 0; color: var(--text-secondary);">${profile.notes}</p>
                    </div>
                ` : ''}
            </div>
        `;
    }
}

function openProfileEditModal(subjectName, profile) {
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

function displaySubjectProfile(subjectName, profile) {
    const content = document.getElementById('subjectProfileContent');
    const form = document.getElementById('subjectProfileForm');
    const token = localStorage.getItem('token');

    if (!profile) {
        // No profile exists - show create option
        content.innerHTML = `
            <div style="padding: 2rem; text-align: center; background: var(--bg-secondary); border-radius: var(--radius-md); margin-bottom: 1rem;">
                <p style="color: var(--text-secondary); margin-bottom: 1rem;">
                    No profile information available for <strong>${subjectName}</strong>
                </p>
                ${token ? `
                    <button onclick="showProfileEditForm('${subjectName.replace(/'/g, "\\'")}', null)" class="btn btn-primary">
                        ✏️ Create Profile
                    </button>
                ` : '<p style="color: var(--text-secondary); font-size: 0.9rem;">Login to create a profile</p>'}
            </div>
        `;
    } else {
        // Display existing profile
        content.innerHTML = `
            <div style="padding: 1.5rem;">
                <h3 style="margin-top: 0; color: var(--primary-color);">${subjectName}</h3>

                ${profile.description ? `
                    <div style="margin-bottom: 1.5rem;">
                        <strong style="color: var(--text-secondary); font-size: 0.9rem;">Description:</strong>
                        <p style="margin: 0.5rem 0 0 0;">${profile.description}</p>
                    </div>
                ` : ''}

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                    ${profile.professor_name ? `
                        <div>
                            <strong style="color: var(--text-secondary); font-size: 0.9rem;">Professor:</strong>
                            <p style="margin: 0.25rem 0 0 0;">${profile.professor_name}</p>
                        </div>
                    ` : ''}

                    ${profile.course_code ? `
                        <div>
                            <strong style="color: var(--text-secondary); font-size: 0.9rem;">Course Code:</strong>
                            <p style="margin: 0.25rem 0 0 0;">${profile.course_code}</p>
                        </div>
                    ` : ''}

                    ${profile.semester || profile.year ? `
                        <div>
                            <strong style="color: var(--text-secondary); font-size: 0.9rem;">Semester:</strong>
                            <p style="margin: 0.25rem 0 0 0;">${profile.semester || ''} ${profile.year || ''}</p>
                        </div>
                    ` : ''}

                    ${profile.credits ? `
                        <div>
                            <strong style="color: var(--text-secondary); font-size: 0.9rem;">Credits:</strong>
                            <p style="margin: 0.25rem 0 0 0;">${profile.credits}</p>
                        </div>
                    ` : ''}
                </div>

                ${profile.notes ? `
                    <div style="margin-bottom: 1.5rem;">
                        <strong style="color: var(--text-secondary); font-size: 0.9rem;">Notes:</strong>
                        <p style="margin: 0.5rem 0 0 0; color: var(--text-secondary);">${profile.notes}</p>
                    </div>
                ` : ''}

                ${token ? `
                    <button onclick='showProfileEditForm(${JSON.stringify(subjectName)}, ${JSON.stringify(profile)})' class="btn btn-primary">
                        ✏️ Edit Profile
                    </button>
                ` : ''}
            </div>
        `;
    }
}

function showProfileEditForm(subjectName, profile) {
    const content = document.getElementById('subjectProfileContent');
    const form = document.getElementById('subjectProfileForm');

    // Hide display, show form
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

async function saveSubjectProfile(event) {
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
        const response = await fetchAPI('/api/subject-profiles', {
            method: 'POST',
            body: JSON.stringify(formData)
        });

        // Show success message
        alert('Profile saved successfully!');

        // Close modal
        closeSubjectProfileModal();

        // Refresh the detail panel if it's visible
        const panelId = 'detail-' + subjectName.replace(/[^a-zA-Z0-9]/g, '_');
        const detailPanel = document.getElementById(panelId);
        if (detailPanel && detailPanel.style.display === 'block') {
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

            displaySubjectProfileInPanel(detailPanel, subjectName, profile);
        }
    } catch (error) {
        alert('Failed to save profile: ' + error.message);
    }
}

function closeSubjectProfileModal() {
    // Just hide the modal
    document.getElementById('subjectProfileModal').classList.add('hidden');
}
</script>
@endsection
