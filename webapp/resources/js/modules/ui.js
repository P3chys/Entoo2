import { state } from './state.js';
import { isFavorite } from './favorites.js';
import { escapeHtml, getFileIcon, formatBytes, getFileTypeBadge } from './utils.js';
import { renderSubjectProfile } from '../subject-profile-renderer.js';

/**
 * Update star icon for a subject
 */
export function updateStarIcon(subjectName) {
    const isFav = isFavorite(subjectName);
    const stars = document.querySelectorAll(`.favorite-star[data-subject-name="${CSS.escape(subjectName)}"]`);

    stars.forEach(star => {
        if (isFav) {
            star.textContent = '★';
            star.classList.add('active');
            star.title = 'Remove from favorites';
        } else {
            star.textContent = '☆';
            star.classList.remove('active');
            star.title = 'Add to favorites';
        }

        // Add animation
        star.classList.add('animating');
        setTimeout(() => star.classList.remove('animating'), 300);
    });
}

/**
 * Build tree structure
 */
export function buildTreeStructure(subjects) {
    const treeView = document.getElementById('treeView');
    if (!treeView) return;

    // Sort subjects: favorites first, then alphabetically
    const sortedSubjects = subjects.sort((a, b) => {
        const aFav = isFavorite(a.subject_name);
        const bFav = isFavorite(b.subject_name);

        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
        return a.subject_name.localeCompare(b.subject_name);
    });

    // Clear existing content
    treeView.innerHTML = '';

    sortedSubjects.forEach(subject => {
        const subjectName = subject.subject_name;
        const totalFiles = subject.file_count;
        const isFav = isFavorite(subjectName);

        // Create DOM elements safely
        const subjectDiv = document.createElement('div');
        subjectDiv.className = 'tree-subject glass-subject subject-row';
        subjectDiv.dataset.subject = subjectName;

        const headerDiv = document.createElement('div');
        headerDiv.className = 'subject-header';
        headerDiv.dataset.subjectName = subjectName;

        const titleDiv = document.createElement('div');
        titleDiv.className = 'subject-title';

        const icon = document.createElement('span');
        icon.className = 'subject-icon';
        icon.textContent = '▶';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'subject-name name';
        nameSpan.textContent = subjectName;

        const starSpan = document.createElement('span');
        starSpan.className = `favorite-star star-icon ${isFav ? 'active' : ''}`;
        starSpan.dataset.subjectName = subjectName;
        starSpan.title = isFav ? 'Remove from favorites' : 'Add to favorites';
        starSpan.textContent = isFav ? '★' : '☆';

        titleDiv.appendChild(icon);
        titleDiv.appendChild(nameSpan);
        titleDiv.appendChild(starSpan);

        const countDiv = document.createElement('div');
        countDiv.style.display = 'flex';
        countDiv.style.alignItems = 'center';
        countDiv.style.gap = '1rem';

        const countSpan = document.createElement('span');
        countSpan.className = 'subject-count file-count count';
        countSpan.textContent = `${totalFiles} files`;

        countDiv.appendChild(countSpan);

        headerDiv.appendChild(titleDiv);
        headerDiv.appendChild(countDiv);

        const categoriesDiv = document.createElement('div');
        categoriesDiv.className = 'subject-categories files-container file-list';
        categoriesDiv.innerHTML = '<div class="loading" style="padding: 1rem;">Loading categories...</div>';

        subjectDiv.appendChild(headerDiv);
        subjectDiv.appendChild(categoriesDiv);

        treeView.appendChild(subjectDiv);
    });
}

/**
 * Build subject tabs HTML with profile + categories
 */
export function buildSubjectTabsHTML(categories, subjectName, profile) {
    const categoryOrder = ['Prednasky', 'Otazky', 'Materialy', 'Seminare'];
    const subjectId = subjectName.replace(/[^a-zA-Z0-9]/g, '_');

    // Build tab navigation - Profile tab + 4 category tabs
    let tabNavHTML = '<div class="tab-nav">';

    // Escape subject ID for safe data attribute
    const subjectIdEscaped = escapeHtml(subjectId);

    // Profile tab button
    tabNavHTML += `
        <button class="tab-btn active" data-subject-id="${subjectIdEscaped}" data-tab-name="Profile">
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

        const categoryEscaped = escapeHtml(categoryName);

        tabNavHTML += `
            <button class="tab-btn" data-subject-id="${subjectIdEscaped}" data-tab-name="${categoryEscaped}">
                <span>${categoryIcon}</span>
                <span>${categoryEscaped}</span>
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

        tabContentHTML += `
            <div class="tab-content" id="tab-${subjectId}-${categoryName}">
                <button class="upload-btn-category upload-button" id="uploadFileBtn" onclick="openUploadModal(${JSON.stringify(subjectName).replace(/"/g, '&quot;')}, '${categoryName}')">
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

/**
 * Build files HTML list
 */
export function buildFilesHTML(files) {
    const container = document.createElement('div');
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

        const fileItem = document.createElement('div');
        fileItem.className = 'file-item glass-file-item enhanced';

        const fileInfo = document.createElement('div');
        fileInfo.className = 'file-item-info';

        const iconDiv = document.createElement('div');
        iconDiv.className = 'file-item-icon';
        iconDiv.textContent = fileIcon;

        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'file-item-details';

        const h4 = document.createElement('h4');
        const filenameText = document.createTextNode(file.original_filename);
        h4.appendChild(filenameText);

        // Add file type badge
        const badge = getFileTypeBadge(file.file_extension);
        h4.appendChild(badge);

        const metaDiv = document.createElement('div');
        metaDiv.className = 'file-item-meta';

        // Build meta with separators (no extension, it's in the badge now)
        metaDiv.appendChild(document.createTextNode(fileSize));

        const sep1 = document.createElement('span');
        sep1.className = 'meta-separator';
        sep1.textContent = '•';
        metaDiv.appendChild(sep1);

        metaDiv.appendChild(document.createTextNode(date));

        if (ownerId) {
            const sep2 = document.createElement('span');
            sep2.className = 'meta-separator';
            sep2.textContent = '•';
            metaDiv.appendChild(sep2);

            const ownerLink = document.createElement('a');
            ownerLink.href = '#';
            ownerLink.className = 'owner-filter-link';
            ownerLink.dataset.ownerId = ownerId;
            ownerLink.dataset.ownerName = ownerName;
            ownerLink.textContent = `👤 ${ownerName}`; // Auto-escaped

            metaDiv.appendChild(ownerLink);
        }

        detailsDiv.appendChild(h4);
        detailsDiv.appendChild(metaDiv);

        fileInfo.appendChild(iconDiv);
        fileInfo.appendChild(detailsDiv);

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'file-item-actions';

        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'btn btn-primary btn-small download-btn';
        downloadBtn.dataset.fileId = fileId;
        downloadBtn.dataset.filename = file.original_filename;
        downloadBtn.textContent = '⬇ Download';

        actionsDiv.appendChild(downloadBtn);

        if (canDelete) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-danger btn-small delete-btn';
            deleteBtn.dataset.fileId = fileId;
            deleteBtn.textContent = '🗑️ Delete';
            actionsDiv.appendChild(deleteBtn);
        }

        fileItem.appendChild(fileInfo);
        fileItem.appendChild(actionsDiv);

        container.appendChild(fileItem);
    });

    return container.innerHTML;
}
