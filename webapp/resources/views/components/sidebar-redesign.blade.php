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

    {{-- User profile removed - already in navbar --}}
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
