/**
 * File Upload Component - JavaScript Module
 * Handles file upload modal functionality
 */

// Variables to store upload context (subject and category)
let currentUploadSubject = '';
let currentUploadCategory = '';

/**
 * Opens the upload modal for a specific subject and category
 * @param {string} subject - The subject name
 * @param {string} category - The category name
 */
window.openUploadModal = function(subject, category) {
    currentUploadSubject = subject;
    currentUploadCategory = category;

    document.getElementById('uploadSubject').textContent = subject;
    document.getElementById('uploadCategory').textContent = category;
    document.getElementById('uploadModal').classList.remove('hidden');
    document.getElementById('uploadForm').reset();
    document.getElementById('uploadError').classList.add('hidden');
    document.getElementById('uploadSuccess').classList.add('hidden');
}

/**
 * Closes the upload modal
 */
window.closeUploadModal = function() {
    document.getElementById('uploadModal').classList.add('hidden');
    currentUploadSubject = '';
    currentUploadCategory = '';
}

/**
 * Handles the file upload form submission
 * @param {Event} event - The form submit event
 */
window.handleFileUpload = async function(event) {
    event.preventDefault();

    const formData = new FormData();
    formData.append('file', document.getElementById('fileInput').files[0]);
    formData.append('subject_name', currentUploadSubject);
    formData.append('category', currentUploadCategory);

    const uploadBtn = document.getElementById('uploadBtn');
    const uploadProgress = document.getElementById('uploadProgress');
    const uploadError = document.getElementById('uploadError');
    const uploadSuccess = document.getElementById('uploadSuccess');

    uploadBtn.disabled = true;
    uploadProgress.classList.remove('hidden');
    uploadError.classList.add('hidden');
    uploadSuccess.classList.add('hidden');

    try {
        const response = await fetch('/api/files', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Accept': 'application/json'
            },
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            uploadSuccess.textContent = 'File uploaded successfully!';
            uploadSuccess.classList.remove('hidden');

            setTimeout(() => {
                closeUploadModal();
                // Reload dashboard if the function exists
                if (typeof loadDashboard === 'function') {
                    loadDashboard();
                }
            }, 1500);
        } else {
            uploadError.textContent = data.message || 'Upload failed';
            uploadError.classList.remove('hidden');
        }
    } catch (error) {
        uploadError.textContent = 'Upload failed';
        uploadError.classList.remove('hidden');
    } finally {
        uploadBtn.disabled = false;
        uploadProgress.classList.add('hidden');
    }
}

/**
 * Initialize file upload modal functionality
 */
function initFileUploadModal() {
    // Close modal when clicking outside of it
    document.addEventListener('click', function(event) {
        const modal = document.getElementById('uploadModal');
        if (event.target === modal) {
            closeUploadModal();
        }
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFileUploadModal);
} else {
    initFileUploadModal();
}
