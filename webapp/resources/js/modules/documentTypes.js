/**
 * Document Type Mapping and Constants
 * Maps backend category values to frontend display labels
 */

// Document type configuration
export const DOCUMENT_TYPES = {
    // Map backend category names to frontend labels
    MATERIALY: {
        key: 'Materialy',
        label: 'Notes',
        icon: '📝',
        subtitle: 'Lecture notes & summaries',
        color: '#3b82f6'
    },
    PREDNASKY: {
        key: 'Prednasky',
        label: 'Case Briefs',
        icon: '⚖️',
        subtitle: 'Case analysis & rulings',
        color: '#8b5cf6'
    },
    SEMINARE: {
        key: 'Seminare',
        label: 'Statutes',
        icon: '📜',
        subtitle: 'Acts, regulations & bills',
        color: '#f59e0b'
    },
    OTAZKY: {
        key: 'Otazky',
        label: 'Past Papers',
        icon: '📄',
        subtitle: 'Exams & model answers',
        color: '#10b981'
    },
    DISCUSSION: {
        key: 'Discussion',
        label: 'Discussion',
        icon: '💬',
        subtitle: 'Subject Q&A & Chat',
        color: '#6366f1',
        isSpecial: true  // Not a file category, handled separately
    }
};

// Get all document types as array
export function getAllDocumentTypes() {
    return Object.values(DOCUMENT_TYPES);
}

// Get document type by backend key
export function getDocumentTypeByKey(key) {
    const found = Object.values(DOCUMENT_TYPES).find(type => type.key === key);
    return found || DOCUMENT_TYPES.MATERIALY; // Default to Notes
}

// Get frontend label for backend category
export function getCategoryLabel(category) {
    const type = getDocumentTypeByKey(category);
    return type.label;
}

// Get icon for category
export function getCategoryIcon(category) {
    const type = getDocumentTypeByKey(category);
    return type.icon;
}

// Get all file categories (excluding Discussion)
export function getFileCategories() {
    return Object.values(DOCUMENT_TYPES).filter(type => !type.isSpecial);
}

// File type badge colors
export const FILE_TYPE_COLORS = {
    pdf: '#ef4444',
    docx: '#3b82f6',
    doc: '#3b82f6',
    txt: '#6b7280',
    pptx: '#f59e0b',
    ppt: '#f59e0b'
};

// Get badge color for file extension
export function getBadgeColor(extension) {
    const ext = extension.toLowerCase();
    return FILE_TYPE_COLORS[ext] || FILE_TYPE_COLORS.txt;
}

// Format file size
export function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size > 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// Format relative time (e.g., "2 hours ago")
export function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;

    // Format as date if older than a month
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Get user initials from name
export function getUserInitials(name) {
    if (!name) return '?';

    const parts = name.trim().split(' ');
    if (parts.length === 1) {
        return parts[0].charAt(0).toUpperCase();
    }

    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// Get subject initials from subject name
export function getSubjectInitials(subjectName) {
    if (!subjectName) return '??';

    const words = subjectName.trim().split(' ');
    if (words.length === 1) {
        return subjectName.substring(0, 2).toUpperCase();
    }

    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}

// Get random avatar color
export function getAvatarColor(seed) {
    const colors = ['blue', 'purple', 'green', 'orange', 'pink', 'indigo'];
    const index = Math.abs(hashCode(seed)) % colors.length;
    return colors[index];
}

// Simple hash code function for consistent color assignment
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}

export default {
    DOCUMENT_TYPES,
    getAllDocumentTypes,
    getDocumentTypeByKey,
    getCategoryLabel,
    getCategoryIcon,
    getFileCategories,
    FILE_TYPE_COLORS,
    getBadgeColor,
    formatFileSize,
    formatRelativeTime,
    getUserInitials,
    getSubjectInitials,
    getAvatarColor
};
