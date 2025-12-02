{{-- Redesigned Sidebar with Semester Grouping --}}
<aside class="dashboard-sidebar" id="dashboardSidebar">
    {{-- Sidebar Header --}}
    <div class="sidebar-header">
        <h2>MY SUBJECTS</h2>
    </div>

    {{-- Sidebar Content with Semester Groups --}}
    <div class="sidebar-content">
        {{-- Semester 1 --}}
        <div class="semester-group" data-semester="1">
            <div class="semester-group-header">SEMESTER 1</div>
            <ul class="semester-group-list" id="semester-1-list">
                {{-- Subjects will be populated by JavaScript --}}
            </ul>
        </div>

        {{-- Semester 2 --}}
        <div class="semester-group" data-semester="2">
            <div class="semester-group-header">SEMESTER 2</div>
            <ul class="semester-group-list" id="semester-2-list">
                {{-- Subjects will be populated by JavaScript --}}
            </ul>
        </div>

        {{-- Semester 3 --}}
        <div class="semester-group" data-semester="3">
            <div class="semester-group-header">SEMESTER 3</div>
            <ul class="semester-group-list" id="semester-3-list">
                {{-- Subjects will be populated by JavaScript --}}
            </ul>
        </div>

        {{-- Semester 4 --}}
        <div class="semester-group" data-semester="4">
            <div class="semester-group-header">SEMESTER 4</div>
            <ul class="semester-group-list" id="semester-4-list">
                {{-- Subjects will be populated by JavaScript --}}
            </ul>
        </div>

        {{-- Semester 5 --}}
        <div class="semester-group" data-semester="5">
            <div class="semester-group-header">SEMESTER 5</div>
            <ul class="semester-group-list" id="semester-5-list">
                {{-- Subjects will be populated by JavaScript --}}
            </ul>
        </div>

        {{-- Semester 6 --}}
        <div class="semester-group" data-semester="6">
            <div class="semester-group-header">SEMESTER 6</div>
            <ul class="semester-group-list" id="semester-6-list">
                {{-- Subjects will be populated by JavaScript --}}
            </ul>
        </div>

        {{-- Non-Assigned Subjects --}}
        <div class="semester-group" data-semester="unassigned">
            <div class="semester-group-header">NON-ASSIGNED</div>
            <ul class="semester-group-list" id="semester-unassigned-list">
                {{-- Subjects will be populated by JavaScript --}}
            </ul>
        </div>

        {{-- Add Subject Button --}}
        <button class="add-subject-btn" id="addSubjectBtn">
            <span>+</span>
            <span>Add Subject</span>
        </button>
    </div>

    {{-- User Profile Card --}}
    <div class="sidebar-footer">
        <div class="user-profile-card" id="userProfileCard">
            <div class="user-avatar">
                {{ strtoupper(substr(Auth::user()->name ?? 'U', 0, 2)) }}
            </div>
            <div class="user-info">
                <div class="user-name">{{ Auth::user()->name ?? 'User' }}</div>
                <div class="user-meta">Student</div>
            </div>
            <svg class="user-settings-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        </div>
    </div>
</aside>

{{-- Mobile Sidebar Overlay --}}
<div class="sidebar-overlay" id="sidebarOverlay"></div>

<script>
    // Handle sidebar toggle on mobile
    document.getElementById('sidebarOverlay')?.addEventListener('click', () => {
        document.getElementById('dashboardSidebar')?.classList.remove('open');
        document.getElementById('sidebarOverlay')?.classList.remove('active');
    });

    // User profile card click handler
    document.getElementById('userProfileCard')?.addEventListener('click', (e) => {
        e.preventDefault();
        // TODO: Show user menu dropdown
        console.log('User profile clicked');
    });

    // Add subject button click handler
    document.getElementById('addSubjectBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        // TODO: Open add subject modal
        console.log('Add subject clicked');
    });
</script>
