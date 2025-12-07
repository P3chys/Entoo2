{{-- Subject Profile Modal Component --}}
<div id="subjectProfileModal" class="modal glass-modal-backdrop hidden">
    <div class="modal-content glass-modal-content" style="max-width: 700px;">
        <div class="modal-header">
            <h2>📋 Subject Profile</h2>
            <button onclick="closeSubjectProfileModal()" class="close-btn">&times;</button>
        </div>

        <div id="subjectProfileContent" style="padding: var(--spacing-xl);">
            <div class="loading">Loading profile...</div>
        </div>

        <div id="subjectProfileForm" class="hidden" style="padding: var(--spacing-xl);">
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

                <div class="form-group">
                    <label for="profileSemester">Semester Group</label>
                    <select id="profileSemester" name="semester">
                        <option value="">Not assigned (Other)</option>
                        <option value="1">Semester 1</option>
                        <option value="2">Semester 2</option>
                    </select>
                    <small>This determines which sidebar group the subject appears in</small>
                </div>

                <div class="form-group">
                    <label for="profileColor">Color Theme</label>
                    <input type="color" id="profileColor" name="color" value="#2563eb" style="height: 48px; cursor: pointer;">
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

@push('scripts')
    @vite('resources/js/subject-profile-modal.js')
@endpush
