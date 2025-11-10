/**
 * Subject Profile Modal - JavaScript Module
 * Handles subject profile viewing, editing, and saving
 */

/**
 * View subject profile in expandable panel
 */
window.viewSubjectProfile = async function(subjectName, event) {
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
window.displaySubjectProfileInPanel = function(panel, subjectName, profile) {
    const token = localStorage.getItem('token');

    if (!profile) {
        // No profile exists - show create option
        panel.innerHTML = `
            <div style="padding: 1.5rem; background: rgba(0, 255, 255, 0.5); border-top: 1px solid var(--glass-border);">
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

/**
 * Open modal to edit/create profile
 */
window.openProfileEditModal = function(subjectName, profile) {
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
window.saveSubjectProfile = async function(event) {
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

    console.log('Saving profile:', formData);

    try {
        // First check if profile exists
        const checkResponse = await fetch(`/api/subject-profiles/${encodeURIComponent(subjectName)}`, {
            headers: { 'Accept': 'application/json' }
        });

        const profileExists = checkResponse.ok;
        console.log('Profile exists:', profileExists);

        // Use PUT if exists, POST if new
        const method = profileExists ? 'PUT' : 'POST';
        const url = profileExists
            ? `/api/subject-profiles/${encodeURIComponent(subjectName)}`
            : '/api/subject-profiles';

        console.log(`Using ${method} to ${url}`);

        // Use global fetchAPI if available, otherwise use fetch directly
        let response;
        if (typeof window.fetchAPI === 'function') {
            console.log('Using fetchAPI');
            response = await window.fetchAPI(url, {
                method: method,
                body: JSON.stringify(formData)
            });
            console.log('Profile save response:', response);
        } else {
            console.log('Using fetch directly');
            const token = localStorage.getItem('token');
            const rawResponse = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            console.log('Response status:', rawResponse.status);

            if (!rawResponse.ok) {
                const errorData = await rawResponse.json();
                throw new Error(errorData.message || 'Failed to save profile');
            }

            response = await rawResponse.json();
            console.log('Profile save response:', response);
        }

        // Show success message
        alert('Profile saved successfully!');

        // Close modal
        window.closeSubjectProfileModal();

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

            window.displaySubjectProfileInPanel(detailPanel, subjectName, profile);
        }
    } catch (error) {
        console.error('Error saving profile:', error);
        alert('Failed to save profile: ' + error.message);
    }
}

/**
 * Close subject profile modal
 */
window.closeSubjectProfileModal = function() {
    document.getElementById('subjectProfileModal').classList.add('hidden');
}
