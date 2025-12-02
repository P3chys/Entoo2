{{-- Enhanced Subject Header Component --}}
<div class="subject-header" id="subjectHeader">
    {{-- Top Section --}}
    <div class="subject-header-top">
        <div class="subject-header-info">
            {{-- Breadcrumb / Course Code --}}
            <div class="subject-header-breadcrumb">
                <span class="subject-code" id="subjectCode">
                    {{-- Will be populated by JavaScript --}}
                </span>
                <span class="breadcrumb-separator">›</span>
                <span id="professorName">
                    {{-- Will be populated by JavaScript --}}
                </span>
            </div>

            {{-- Subject Title --}}
            <h1 class="subject-title" id="subjectTitle">
                {{-- Will be populated by JavaScript --}}
            </h1>

            {{-- Professor Info --}}
            <div class="subject-professor" id="subjectProfessorInfo" style="display: none;">
                <svg class="professor-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span id="professorNameFull">
                    {{-- Will be populated by JavaScript --}}
                </span>
            </div>

            {{-- Subject Description --}}
            <p class="subject-description" id="subjectDescription">
                {{-- Will be populated by JavaScript --}}
            </p>
        </div>

        {{-- Action Buttons --}}
        <div class="subject-header-actions">
            <button class="btn-favorite" id="favoriteBtn" title="Add to favorites">
                <svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                <span>Favorite</span>
            </button>

            <button class="btn-edit-subject" id="editSubjectBtn" title="Edit subject info">
                <svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Edit</span>
            </button>

            <button class="btn-upload" id="uploadBtn" title="Upload files">
                <svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span>Upload</span>
            </button>
        </div>
    </div>

    {{-- Metadata Section (Optional) --}}
    <div class="subject-metadata" id="subjectMetadata" style="display: none;">
        <div class="subject-meta-item" id="metaSemester" style="display: none;">
            <span class="subject-meta-label">Semester:</span>
            <span class="subject-meta-value" id="metaSemesterValue">-</span>
        </div>

        <div class="subject-meta-item" id="metaYear" style="display: none;">
            <span class="subject-meta-label">Year:</span>
            <span class="subject-meta-value" id="metaYearValue">-</span>
        </div>

        <div class="subject-meta-item" id="metaCredits" style="display: none;">
            <span class="subject-meta-label">Credits:</span>
            <span class="subject-meta-value" id="metaCreditsValue">-</span>
        </div>

        <div class="subject-meta-item" id="metaDocuments">
            <span class="subject-meta-label">Documents:</span>
            <span class="subject-meta-value" id="metaDocumentsValue">0</span>
        </div>
    </div>
</div>

<script>
    // Handle favorite button click
    document.getElementById('favoriteBtn')?.addEventListener('click', function() {
        this.classList.toggle('active');
        const isFavorite = this.classList.contains('active');

        // Update button text
        const span = this.querySelector('span');
        if (span) {
            span.textContent = isFavorite ? 'Favorited' : 'Favorite';
        }

        // TODO: Call API to toggle favorite
        console.log('Favorite toggled:', isFavorite);
    });

    // Handle edit subject button click
    document.getElementById('editSubjectBtn')?.addEventListener('click', function() {
        // TODO: Open subject profile modal
        console.log('Edit subject clicked');
    });

    // Handle upload button click
    document.getElementById('uploadBtn')?.addEventListener('click', function() {
        // TODO: Open file upload modal
        console.log('Upload clicked');
    });
</script>
