/**
 * Subject Profile Modal - JavaScript Module
 * Handles subject profile viewing, editing, and saving
 */

import { renderSubjectProfile } from './subject-profile-renderer.js';
import { fetchAPI } from './modules/api.js';

/**
 * View subject profile in expandable panel
 */
window.viewSubjectProfile = async function (subjectName, event) {
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
        // Try to fetch existing profile - 404 is expected for subjects without profiles
        const response = await fetch(`/api/subject-profiles/${encodeURIComponent(subjectName)}`, {
            headers: {
                'Accept': 'application/json'
            }
        }).then(res => res.ok ? res : null).catch(() => null);

        let profile = null;
        if (response) {
            const data = await response.json();
            profile = data.profile;
        }

        // Display profile info in the panel
        displaySubjectProfileInPanel(detailPanel, subjectName, profile);
    } catch (error) {
        detailPanel.innerHTML = '<p class="error" style="padding: 1rem;">Failed to load profile</p>';
    }
}

/**
 * Display subject profile in the expandable panel
 */
window.displaySubjectProfileInPanel = function (panel, subjectName, profile) {
    // Use shared renderer with panel-specific styling
    const profileHTML = renderSubjectProfile(subjectName, profile, 'profile-container profile-panel');

    // Wrap in panel container with border
    panel.innerHTML = `
        <div style="border-top: 1px solid rgba(255, 255, 255, 0.2);">
            ${profileHTML}
        </div>
    `;
}

/**
 * Open modal to edit/create profile
 */
window.openProfileEditModal = function (subjectName, profile) {
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

/**
 * Save subject profile
 */
window.saveSubjectProfile = async function (event) {
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
        // First check if profile exists
        const checkResponse = await fetch(`/api/subject-profiles/${encodeURIComponent(subjectName)}`, {
            headers: { 'Accept': 'application/json' }
        });

        const profileExists = checkResponse.ok;

        // Use PUT if exists, POST if new
        const method = profileExists ? 'PUT' : 'POST';
        const url = profileExists
            ? `/api/subject-profiles/${encodeURIComponent(subjectName)}`
            : '/api/subject-profiles';

        // Use fetchAPI from module
        await fetchAPI(url, {
            method: method,
            body: JSON.stringify(formData)
        });

        // Show success message
        alert('Profile saved successfully!');

        // Close modal
        window.closeSubjectProfileModal();

        // Reload the subject in the dashboard to reflect changes
        if (typeof window.reloadSubject === 'function') {
            await window.reloadSubject(subjectName);
        } else {
            // Fallback for other views (like detail panel if it exists)
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

                window.displaySubjectProfileInPanel(detailPanel, subjectName, profile);
            }
        }
    } catch (error) {
        console.error('Error saving profile:', error);
        alert('Failed to save profile: ' + error.message);
    }
}

/**
 * Close subject profile modal
 */
window.closeSubjectProfileModal = function () {
    document.getElementById('subjectProfileModal').classList.add('hidden');
}
