@extends('layouts.app')

@section('title', 'Admin Dashboard - Entoo')

@push('styles')
    @vite('resources/css/admin.css')
@endpush

@push('scripts')
    {{-- Auth check - validates token before loading page --}}
    @vite('resources/js/auth-check.js')
@endpush

@section('content')
<div class="admin-dashboard-container">
    <div class="container">
        <!-- Admin Header -->
        <div class="admin-header">
            <h1>Admin Dashboard</h1>
            <div class="admin-actions">
                <button id="backToDashboard" class="btn btn-secondary">
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path fill-rule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/>
                    </svg>
                    Back to Dashboard
                </button>
            </div>
        </div>

        <!-- Dashboard Stats -->
        <div class="admin-stats-grid">
            <div class="stat-card glass-stat-card">
                <div class="stat-icon">
                    <svg width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1h8zm-7.978-1A.261.261 0 0 1 7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002a.274.274 0 0 1-.014.002H7.022zM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM6.936 9.28a5.88 5.88 0 0 0-1.23-.247A7.35 7.35 0 0 0 5 9c-4 0-5 3-5 4 0 .667.333 1 1 1h4.216A2.238 2.238 0 0 1 5 13c0-1.01.377-2.042 1.09-2.904.243-.294.526-.569.846-.816zM4.92 10A5.493 5.493 0 0 0 4 13H1c0-.26.164-1.03.76-1.724.545-.636 1.492-1.256 3.16-1.275zM1.5 5.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0zm3-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
                    </svg>
                </div>
                <div class="stat-content">
                    <h3 id="totalUsers">0</h3>
                    <p>Total Users</p>
                </div>
            </div>
            <div class="stat-card glass-stat-card">
                <div class="stat-icon">
                    <svg width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/>
                        <path d="M4.603 14.087a.81.81 0 0 1-.438-.42c-.195-.388-.13-.776.08-1.102.198-.307.526-.568.897-.787a7.68 7.68 0 0 1 1.482-.645 19.697 19.697 0 0 0 1.062-2.227 7.269 7.269 0 0 1-.43-1.295c-.086-.4-.119-.796-.046-1.136.075-.354.274-.672.65-.823.192-.077.4-.12.602-.077a.7.7 0 0 1 .477.365c.088.164.12.356.127.538.007.188-.012.396-.047.614-.084.51-.27 1.134-.52 1.794a10.954 10.954 0 0 0 .98 1.686 5.753 5.753 0 0 1 1.334.05c.364.066.734.195.96.465.12.144.193.32.2.518.007.192-.047.382-.138.563a1.04 1.04 0 0 1-.354.416.856.856 0 0 1-.51.138c-.331-.014-.654-.196-.933-.417a5.712 5.712 0 0 1-.911-.95 11.651 11.651 0 0 0-1.997.406 11.307 11.307 0 0 1-1.02 1.51c-.292.35-.609.656-.927.787a.793.793 0 0 1-.58.029zm1.379-1.901c-.166.076-.32.156-.459.238-.328.194-.541.383-.647.547-.094.145-.096.25-.04.361.01.022.02.036.026.044a.266.266 0 0 0 .035-.012c.137-.056.355-.235.635-.572a8.18 8.18 0 0 0 .45-.606zm1.64-1.33a12.71 12.71 0 0 1 1.01-.193 11.744 11.744 0 0 1-.51-.858 20.801 20.801 0 0 1-.5 1.05zm2.446.45c.15.163.296.3.435.41.24.19.407.253.498.256a.107.107 0 0 0 .07-.015.307.307 0 0 0 .094-.125.436.436 0 0 0 .059-.2.095.095 0 0 0-.026-.063c-.052-.062-.2-.152-.518-.209a3.876 3.876 0 0 0-.612-.053zM8.078 7.8a6.7 6.7 0 0 0 .2-.828c.031-.188.043-.343.038-.465a.613.613 0 0 0-.032-.198.517.517 0 0 0-.145.04c-.087.035-.158.106-.196.283-.04.192-.03.469.046.822.024.111.054.227.09.346z"/>
                    </svg>
                </div>
                <div class="stat-content">
                    <h3 id="totalFiles">0</h3>
                    <p>Total Files</p>
                </div>
            </div>
            <div class="stat-card glass-stat-card">
                <div class="stat-icon">
                    <svg width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2zm13 2.383-4.708 2.825L15 11.105V5.383zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741zM1 11.105l4.708-2.897L1 5.383v5.722z"/>
                    </svg>
                </div>
                <div class="stat-content">
                    <h3 id="totalSubjects">0</h3>
                    <p>Total Subjects</p>
                </div>
            </div>
            <div class="stat-card glass-stat-card">
                <div class="stat-icon">
                    <svg width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                        <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z"/>
                    </svg>
                </div>
                <div class="stat-content">
                    <h3 id="totalStorage">0 MB</h3>
                    <p>Storage Used</p>
                </div>
            </div>
        </div>

        <!-- Tab Navigation -->
        <div class="admin-tabs">
            <button class="admin-tab active" data-tab="users">
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1h8zm-7.978-1A.261.261 0 0 1 7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002a.274.274 0 0 1-.014.002H7.022zM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
                </svg>
                Users
            </button>
            <button class="admin-tab" data-tab="files">
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/>
                </svg>
                Files
            </button>
            <button class="admin-tab" data-tab="subjects">
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/>
                </svg>
                Subjects
            </button>

        </div>

        <!-- Users Tab Content -->
        <div class="admin-tab-content active" id="users-tab">
            <div class="admin-section">
                <div class="admin-section-header">
                    <h2>User Management</h2>
                    <div class="admin-section-actions">
                        <input type="text" id="userSearch" placeholder="Search users..." class="search-input">
                        <button id="createUserBtn" class="btn btn-primary">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                            </svg>
                            Create User
                        </button>
                    </div>
                </div>
                <div id="usersTable" class="admin-table-container">
                    <!-- Users table will be populated by JavaScript -->
                </div>
                <div id="usersPagination" class="pagination-container">
                    <!-- Pagination will be populated by JavaScript -->
                </div>
            </div>
        </div>

        <!-- Files Tab Content -->
        <div class="admin-tab-content" id="files-tab">
            <div class="admin-section">
                <div class="admin-section-header">
                    <h2>File Management</h2>
                    <div class="admin-section-actions">
                        <input type="text" id="fileSearch" placeholder="Search files..." class="search-input">
                        <select id="subjectFilter" class="filter-select">
                            <option value="">All Subjects</option>
                        </select>
                        <select id="categoryFilter" class="filter-select">
                            <option value="">All Categories</option>
                            <option value="Materialy">Materialy</option>
                            <option value="Otazky">Otazky</option>
                            <option value="Prednasky">Prednasky</option>
                            <option value="Seminare">Seminare</option>
                        </select>
                    </div>
                </div>
                <div id="filesTable" class="admin-table-container">
                    <!-- Files table will be populated by JavaScript -->
                </div>
                <div id="filesPagination" class="pagination-container">
                    <!-- Pagination will be populated by JavaScript -->
                </div>
            </div>
        </div>

        <!-- Subjects Tab Content -->
        <div class="admin-tab-content" id="subjects-tab">
            <div class="admin-section">
                <div class="admin-section-header">
                    <h2>Subject Management</h2>
                    <div class="admin-section-actions">
                        <input type="text" id="subjectSearch" placeholder="Search subjects..." class="search-input">
                        <button id="createSubjectBtn" class="btn btn-primary">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                            </svg>
                            Create Subject
                        </button>
                    </div>
                </div>
                <div id="subjectsTable" class="admin-table-container">
                    <!-- Subjects table will be populated by JavaScript -->
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Subject Modal -->
<div id="subjectModal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h3 id="subjectModalTitle">Create Subject</h3>
            <button class="close-modal">&times;</button>
        </div>
        <div class="modal-body">
            <form id="subjectForm">
                <input type="hidden" id="subjectId" name="subject_id">
                <div class="form-group">
                    <label for="subjectName">Subject Name</label>
                    <input type="text" id="subjectName" name="subject_name" autocomplete="off" required>
                    <small class="form-text text-muted">Changing this will rename the subject for all existing files!</small>
                </div>
                <div class="form-group">
                    <label for="subjectDescription">Description</label>
                    <textarea id="subjectDescription" name="description" rows="3"></textarea>
                </div>
                <div class="form-row">
                    <div class="form-group col-md-6">
                        <label for="subjectCode">Course Code</label>
                        <input type="text" id="subjectCode" name="course_code">
                    </div>
                    <div class="form-group col-md-6">
                        <label for="subjectCredits">Credits</label>
                        <input type="number" id="subjectCredits" name="credits" min="0" max="20">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group col-md-6">
                        <label for="subjectSemester">Semester</label>
                        <select id="subjectSemester" name="semester">
                            <option value="">Select...</option>
                            <option value="Zimní">Zimní</option>
                            <option value="Letní">Letní</option>
                        </select>
                    </div>
                    <div class="form-group col-md-6">
                        <label for="subjectYear">Year</label>
                        <input type="number" id="subjectYear" name="year" min="2000" max="2100">
                    </div>
                </div>
                <div class="form-group">
                    <label for="subjectProfessor">Professor</label>
                    <input type="text" id="subjectProfessor" name="professor_name">
                </div>
            </form>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary close-modal">Cancel</button>
            <button type="submit" form="subjectForm" class="btn btn-primary">Save</button>
        </div>
    </div>
</div>

<!-- User Modal -->
<div id="userModal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h3 id="userModalTitle">Create User</h3>
            <button class="close-modal">&times;</button>
        </div>
        <div class="modal-body">
            <form id="userForm">
                <input type="hidden" id="userId" name="user_id">
                <div class="form-group">
                    <label for="userName">Name</label>
                    <input type="text" id="userName" name="name" autocomplete="off" required>
                </div>
                <div class="form-group">
                    <label for="userEmail">Email</label>
                    <input type="email" id="userEmail" name="email" autocomplete="off" required>
                </div>
                <div class="form-group">
                    <label for="userPassword">Password</label>
                    <input type="password" id="userPassword" name="password" autocomplete="new-password">
                    <small id="passwordHelp" class="form-text">Leave blank to keep current password</small>
                </div>
                <div class="form-group checkbox-group">
                    <label>
                        <input type="checkbox" id="userIsAdmin" name="is_admin">
                        <span>Admin User</span>
                    </label>
                </div>
            </form>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary close-modal">Cancel</button>
            <button type="submit" form="userForm" class="btn btn-primary">Save</button>
        </div>
    </div>
</div>

@endsection

@push('scripts')
    <script type="module" src="{{ Vite::asset('resources/js/admin.js') }}"></script>
@endpush
