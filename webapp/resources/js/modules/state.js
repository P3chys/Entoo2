/**
 * Global state management
 */
export const state = {
    allFiles: [],
    subjectFiles: {},
    fileIdIndex: new Map(), // O(1) lookup: fileId → subjectName
    favorites: [],
    searchMode: false
};

/**
 * Build file ID index for O(1) lookups
 * Replaces O(n*m) linear search through all subjects and files
 * @param {string} subjectName - Subject name
 * @param {Array} files - Array of file objects
 */
export function buildFileIndex(subjectName, files) {
    files.forEach(file => {
        const fileId = file.id || file.file_id;
        if (fileId) {
            state.fileIdIndex.set(fileId, subjectName);
        }
    });
}

/**
 * Clear file index entries for a subject
 * @param {string} subjectName - Subject name
 */
export function clearFileIndex(subjectName) {
    // Remove all entries for this subject
    for (const [fileId, subject] of state.fileIdIndex.entries()) {
        if (subject === subjectName) {
            state.fileIdIndex.delete(fileId);
        }
    }
}
