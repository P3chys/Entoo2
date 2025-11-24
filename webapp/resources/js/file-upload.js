/**
 * File Upload Component - JavaScript Module
 * Handles file upload modal functionality
 */

// Variables to store upload context (subject and category)
let currentUploadSubject = '';
let currentUploadCategory = '';

/**
 * Wrapper function to safely get subject and category from element and open upload modal
 */
window.openUploadModalByElement = function(element) {
    const subject = element.getAttribute('data-subject');
    const category = element.getAttribute('data-category');
    if (subject && category) {
        window.openUploadModal(subject, category);
    }
};

/**
 * Opens the upload modal for a specific subject and category
 * @param {string} subject - The subject name
 * @param {string} category - The category name
 */
window.openUploadModal = function(subject, category) {
    currentUploadSubject = subject;
    currentUploadCategory = category;

    // Show context mode
    document.getElementById('uploadContext').style.display = 'block';
    document.getElementById('uploadSelectors').style.display = 'none';
    document.getElementById('categorySelectGroup').style.display = 'none';

    // Remove required from hidden fields
    document.getElementById('subjectSelect').removeAttribute('required');
    document.getElementById('categorySelect').removeAttribute('required');

    document.getElementById('uploadSubject').textContent = subject;
    document.getElementById('uploadCategory').textContent = category;
    document.getElementById('uploadModal').classList.remove('hidden');
    document.getElementById('uploadForm').reset();
    document.getElementById('uploadError').classList.add('hidden');
    document.getElementById('uploadSuccess').classList.add('hidden');
}

/**
 * Opens the upload modal in global mode with subject/category selectors
 */
window.openUploadModalGlobal = function() {
    currentUploadSubject = '';
    currentUploadCategory = '';

    // Show selector mode
    document.getElementById('uploadContext').style.display = 'none';
    document.getElementById('uploadSelectors').style.display = 'block';
    document.getElementById('categorySelectGroup').style.display = 'block';

    // Add required to visible fields
    document.getElementById('subjectSelect').setAttribute('required', 'required');
    document.getElementById('categorySelect').setAttribute('required', 'required');

    // Populate subject dropdown from dashboard data
    const subjectSelect = document.getElementById('subjectSelect');
    subjectSelect.innerHTML = '<option value="">Select a subject...</option>';

    if (typeof window.allFiles !== 'undefined') {
        const subjects = Object.keys(window.allFiles).sort();
        subjects.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject;
            option.textContent = subject;
            subjectSelect.appendChild(option);
        });
    }

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
 * Polls for file processing status
 * @param {number} fileId - The file ID to check
 */
async function pollProcessingStatus(fileId) {
    const progressText = document.getElementById('progressText');
    const progressFill = document.getElementById('progressFill');
    const uploadError = document.getElementById('uploadError');
    const uploadSuccess = document.getElementById('uploadSuccess');

    let attempts = 0;
    const maxAttempts = 60; // Poll for up to 1 minute (60 * 1 second)

    const poll = async () => {
        attempts++;

        try {
            const response = await fetch(`/api/files/${fileId}/status`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Accept': 'application/json'
                }
            });

            const data = await response.json();

            if (data.processing_status === 'completed') {
                // Processing completed successfully
                progressFill.style.width = '100%';
                progressText.textContent = 'Processing complete!';
                uploadSuccess.textContent = 'File uploaded and processed successfully! Updating file list...';
                uploadSuccess.classList.remove('hidden');

                // Reload only the specific subject that was uploaded to (instead of entire dashboard)
                setTimeout(async () => {
                    closeUploadModal();

                    // If we know which subject this file belongs to, reload just that subject
                    if (currentUploadSubject && typeof window.reloadSubjectFiles === 'function') {
                        await window.reloadSubjectFiles(currentUploadSubject);
                    } else if (typeof loadDashboard === 'function') {
                        // Fallback: reload entire dashboard if specific subject reload not available
                        loadDashboard();
                    }
                }, 1000);
            } else if (data.processing_status === 'failed') {
                // Processing failed
                progressFill.style.width = '100%';
                progressFill.style.backgroundColor = 'var(--color-danger)';
                uploadError.textContent = `Processing failed: ${data.processing_error || 'Unknown error'}`;
                uploadError.classList.remove('hidden');
                document.getElementById('uploadBtn').disabled = false;
                document.getElementById('uploadProgress').classList.add('hidden');
            } else if (data.processing_status === 'processing') {
                // Still processing - update progress
                const progress = Math.min(50 + (attempts * 2), 90); // Simulate progress 50% -> 90%
                progressFill.style.width = `${progress}%`;
                progressText.textContent = 'Processing file content...';

                if (attempts < maxAttempts) {
                    setTimeout(poll, 1000); // Poll again in 1 second
                } else {
                    // Timeout
                    uploadError.textContent = 'Processing is taking longer than expected. Please check back later.';
                    uploadError.classList.remove('hidden');
                    document.getElementById('uploadBtn').disabled = false;
                }
            } else if (data.processing_status === 'pending') {
                // Still pending - update progress
                const progress = Math.min(10 + (attempts * 2), 50); // Simulate progress 10% -> 50%
                progressFill.style.width = `${progress}%`;
                progressText.textContent = 'Queued for processing...';

                if (attempts < maxAttempts) {
                    setTimeout(poll, 1000); // Poll again in 1 second
                } else {
                    // Timeout
                    uploadError.textContent = 'Processing is taking longer than expected. Please check back later.';
                    uploadError.classList.remove('hidden');
                    document.getElementById('uploadBtn').disabled = false;
                }
            }
        } catch (error) {
            uploadError.textContent = 'Failed to check processing status';
            uploadError.classList.remove('hidden');
            document.getElementById('uploadBtn').disabled = false;
            document.getElementById('uploadProgress').classList.add('hidden');
        }
    };

    // Start polling
    poll();
}

/**
 * Handles the file upload form submission
 * @param {Event} event - The form submit event
 */
window.handleFileUpload = async function(event) {
    event.preventDefault();

    // Get subject and category from either context or selectors
    const subject = currentUploadSubject || document.getElementById('subjectSelect')?.value;
    const category = currentUploadCategory || document.getElementById('categorySelect')?.value;

    const formData = new FormData();
    formData.append('file', document.getElementById('fileInput').files[0]);
    formData.append('subject_name', subject);
    formData.append('category', category);

    const uploadBtn = document.getElementById('uploadBtn');
    const uploadProgress = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const uploadError = document.getElementById('uploadError');
    const uploadSuccess = document.getElementById('uploadSuccess');

    uploadBtn.disabled = true;
    uploadProgress.classList.remove('hidden');
    uploadError.classList.add('hidden');
    uploadSuccess.classList.add('hidden');
    progressFill.style.width = '0%';
    progressFill.style.backgroundColor = 'var(--color-primary)';
    progressText.textContent = 'Uploading...';

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
            // Upload successful, now poll for processing status
            progressFill.style.width = '10%';
            progressText.textContent = 'Upload complete, processing...';

            // Start polling for processing status
            pollProcessingStatus(data.file.id);
        } else {
            uploadError.textContent = data.message || 'Upload failed';
            uploadError.classList.remove('hidden');
            uploadBtn.disabled = false;
            uploadProgress.classList.add('hidden');
        }
    } catch (error) {
        uploadError.textContent = 'Upload failed';
        uploadError.classList.remove('hidden');
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
