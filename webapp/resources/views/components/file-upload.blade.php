{{-- File Upload Modal Component --}}
<div id="uploadModal" class="modal hidden">
    <div class="modal-content">
        <div class="modal-header">
            <h2>📤 Upload File</h2>
            <button onclick="closeUploadModal()" class="close-btn">&times;</button>
        </div>

        <div id="uploadError" class="alert alert-error hidden"></div>
        <div id="uploadSuccess" class="alert alert-success hidden"></div>

        <form id="uploadForm" onsubmit="handleFileUpload(event)">
            <!-- Context mode: show selected subject/category -->
            <div class="form-group" id="uploadContext" style="display: none;">
                <label>Uploading to:</label>
                <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1rem;">
                    <strong id="uploadSubject"></strong> → <strong id="uploadCategory"></strong>
                </div>
            </div>

            <!-- Global mode: show dropdowns -->
            <div class="form-group" id="uploadSelectors" style="display: none;">
                <label for="subjectSelect">Subject</label>
                <select id="subjectSelect" name="subject_name" required class="form-control">
                    <option value="">Select a subject...</option>
                </select>
            </div>

            <div class="form-group" id="categorySelectGroup" style="display: none;">
                <label for="categorySelect">Category</label>
                <select id="categorySelect" name="category" required class="form-control">
                    <option value="">Select a category...</option>
                    <option value="Materialy">Materialy</option>
                    <option value="Otazky">Otazky</option>
                    <option value="Prednasky">Prednasky</option>
                    <option value="Seminare">Seminare</option>
                </select>
            </div>

            <div class="form-group">
                <label for="fileInput">Choose File</label>
                <input type="file" id="fileInput" name="file" required
                       accept=".pdf,.doc,.docx,.ppt,.pptx,.txt">
                <small>Supported: PDF, DOC, DOCX, PPT, PPTX, TXT (Max: 50MB)</small>
            </div>

            <div id="uploadProgress" class="upload-progress hidden">
                <div class="progress-bar">
                    <div id="progressFill" class="progress-fill" style="width: 0%"></div>
                </div>
                <p id="progressText">Uploading...</p>
            </div>

            <div class="modal-footer">
                <button type="button" onclick="closeUploadModal()" class="btn btn-secondary">Cancel</button>
                <button type="submit" class="btn btn-primary" id="uploadBtn">📤 Upload</button>
            </div>
        </form>
    </div>
</div>

@push('scripts')
    @vite('resources/js/file-upload.js')
@endpush