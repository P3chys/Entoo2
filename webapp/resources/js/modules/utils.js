import DOMPurify from 'dompurify';

/**
 * Sanitize HTML to prevent XSS attacks
 */
export function sanitizeHTML(html) {
    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['div', 'span', 'p', 'strong', 'button', 'a', 'h3', 'h4'],
        ALLOWED_ATTR: ['class', 'style', 'title', 'href', 'id', 'data-subject', 'data-file-id', 'data-filename', 'data-subject-name', 'data-owner-id', 'data-owner-name', 'data-tab-name', 'data-subject-id']
    });
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get file icon by extension
 */
export function getFileIcon(extension) {
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
 * Escape HTML
 */
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
