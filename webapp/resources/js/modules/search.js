import { fetchAPI } from './api.js';
import { state } from './state.js';
import { getFileIcon, formatBytes } from './utils.js';

/**
 * Perform search from route
 */
export async function performSearchFromRoute() {
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

        state.searchMode = true;
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
 * Display search results
 */
export function displaySearchResults(results, query) {
    const grid = document.getElementById('searchResultsGrid');
    if (!grid) return;

    if (results.length === 0) {
        grid.innerHTML = '<p class="empty-state">No results found</p>';
        return;
    }

    // Clear grid
    grid.innerHTML = '';

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const currentUserId = currentUser.id;

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

        // Create result item
        const resultItem = document.createElement('div');
        resultItem.className = 'search-result-item glass-search-result';

        const resultHeader = document.createElement('div');
        resultHeader.className = 'search-result-header';

        const resultInfo = document.createElement('div');
        resultInfo.className = 'search-result-info';

        const fileDisplayDiv = document.createElement('div');
        fileDisplayDiv.style.display = 'flex';
        fileDisplayDiv.style.alignItems = 'center';
        fileDisplayDiv.style.gap = '1rem';

        const iconSpan = document.createElement('span');
        iconSpan.style.fontSize = '2rem';
        iconSpan.textContent = fileIcon;

        const detailsDiv = document.createElement('div');

        const filenameDiv = document.createElement('div');
        filenameDiv.className = 'search-result-filename';
        filenameDiv.textContent = file.original_filename; // Auto-escaped

        const metaDiv = document.createElement('div');
        metaDiv.className = 'search-result-meta';

        const subjectBadge = document.createElement('span');
        subjectBadge.className = 'badge';
        subjectBadge.textContent = file.subject_name; // Auto-escaped

        const categoryBadge = document.createElement('span');
        categoryBadge.className = 'badge';
        categoryBadge.textContent = file.category; // Auto-escaped

        const sizeSpan = document.createElement('span');
        sizeSpan.textContent = fileSize;

        const extSpan = document.createElement('span');
        extSpan.textContent = file.file_extension.toUpperCase();

        metaDiv.appendChild(subjectBadge);
        metaDiv.appendChild(categoryBadge);
        metaDiv.appendChild(sizeSpan);
        metaDiv.appendChild(extSpan);

        detailsDiv.appendChild(filenameDiv);
        detailsDiv.appendChild(metaDiv);

        fileDisplayDiv.appendChild(iconSpan);
        fileDisplayDiv.appendChild(detailsDiv);

        resultInfo.appendChild(fileDisplayDiv);

        // Add highlight if present
        if (result.highlight && result.highlight.content && result.highlight.content.length > 0) {
            const highlightDiv = document.createElement('div');
            highlightDiv.className = 'search-highlight';
            highlightDiv.textContent = `💡 "${result.highlight.content[0]}"`; // Auto-escaped
            resultInfo.appendChild(highlightDiv);
        }

        const actionsDiv = document.createElement('div');
        actionsDiv.style.display = 'flex';
        actionsDiv.style.alignItems = 'center';
        actionsDiv.style.gap = '1rem';

        const scoreSpan = document.createElement('span');
        scoreSpan.className = `match-score ${scoreClass}`;
        scoreSpan.title = `Relevance Score: ${score.toFixed(2)}`;
        scoreSpan.textContent = `${scoreLabel} (${score.toFixed(1)})`;

        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'btn btn-primary btn-small download-btn';
        downloadBtn.dataset.fileId = file.file_id;
        downloadBtn.dataset.filename = file.original_filename;
        downloadBtn.textContent = '⬇ Download';

        actionsDiv.appendChild(scoreSpan);
        actionsDiv.appendChild(downloadBtn);

        if (canDelete) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-danger btn-small delete-btn';
            deleteBtn.dataset.fileId = file.file_id;
            deleteBtn.textContent = '🗑️ Delete';
            actionsDiv.appendChild(deleteBtn);
        }

        resultHeader.appendChild(resultInfo);
        resultHeader.appendChild(actionsDiv);

        resultItem.appendChild(resultHeader);

        grid.appendChild(resultItem);
    });
}
