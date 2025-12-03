<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>@yield('title', 'LexScholar - Legal Education Platform')</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    @stack('styles')
    <script>
        // Initialize theme immediately to prevent flash
        (function() {
            const savedTheme = localStorage.getItem('theme') || 'light';
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const theme = savedTheme === 'system' ? (prefersDark ? 'dark' : 'light') : savedTheme;
            document.documentElement.setAttribute('data-theme', theme);
        })();
    </script>
</head>
<body>
    <div class="app-layout">
        <!-- Sidebar Navigation -->
        <aside class="sidebar" id="mainSidebar">
            <div class="sidebar-header">
                <a href="/" class="brand-logo">
                    <div class="brand-icon">⚖️</div>
                    <h1>LexScholar</h1>
                </a>
            </div>

            <div class="sidebar-content">
                <!-- Semester 1 Group -->
                <div class="sidebar-group">
                    <h3 class="group-title">SEMESTER 1</h3>
                    <div class="subject-list" id="semester1Subjects">
                        <!-- Populated by JS -->
                        <div class="loading-placeholder"></div>
                    </div>
                </div>

                <!-- Semester 2 Group -->
                <div class="sidebar-group">
                    <h3 class="group-title">SEMESTER 2</h3>
                    <div class="subject-list" id="semester2Subjects">
                        <!-- Populated by JS -->
                    </div>
                </div>

                <!-- Non-Assigned Group -->
                <div class="sidebar-group">
                    <h3 class="group-title">NON-ASSIGNED</h3>
                    <div class="subject-list" id="otherSubjects">
                        <!-- Populated by JS -->
                    </div>
                </div>

                <button class="btn-add-subject" onclick="openAddSubjectModal()">
                    <span>+</span> Add New Subject
                </button>
            </div>

            <div class="sidebar-footer">
                <div class="user-profile-card" onclick="showProfileModal(event)">
                    <div class="avatar avatar-sm" id="sidebarUserAvatar">U</div>
                    <div class="user-info">
                        <span class="user-name" id="sidebarUserName">User</span>
                        <span class="user-role" id="sidebarUserRole">Student</span>
                    </div>
                    <button class="btn-settings" title="Settings">⚙️</button>
                </div>
            </div>
        </aside>

        <!-- Main Content Area -->
        <div class="main-wrapper">
            <!-- Top Navbar -->
            <header class="top-navbar">
                <div class="search-container">
                    <span class="search-icon">🔍</span>
                    <input type="text" id="globalSearch" placeholder="Global Search..." class="search-input">
                </div>

                <div class="navbar-actions">
                    <button onclick="toggleTheme()" class="btn-icon theme-toggle" id="themeToggle" title="Toggle Theme">
                        <span class="theme-icon">🌙</span>
                    </button>
                    
                    <button class="btn btn-primary btn-upload" onclick="openUploadModal()">
                        <span class="icon">📤</span> Upload New File
                    </button>
                </div>
            </header>

            <!-- Page Content -->
            <main class="content-area">
                @yield('content')
            </main>
        </div>
    </div>

    <!-- Profile Modal -->
    <div id="profileModal" class="modal glass-modal-backdrop hidden">
        <div class="modal-content glass-modal-content">
            <div class="modal-header">
                <h2>👤 User Profile</h2>
                <button onclick="closeProfileModal()" class="close-btn">&times;</button>
            </div>
            <div id="profileContent" style="padding: var(--spacing-xl);">
                <div class="loading">Loading profile...</div>
            </div>
        </div>
    </div>

    <script>
        // Theme Toggle Logic
        function toggleTheme() {
            const html = document.documentElement;
            const current = html.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            
            html.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
            
            updateThemeIcon(next);
        }

        function updateThemeIcon(theme) {
            const btn = document.getElementById('themeToggle');
            if(btn) {
                const icon = btn.querySelector('.theme-icon');
                icon.textContent = theme === 'dark' ? '☀️' : '🌙';
            }
        }

        // Initialize UI
        document.addEventListener('DOMContentLoaded', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            updateThemeIcon(currentTheme);
            
            // Update user info in sidebar
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            if (user.name) {
                document.getElementById('sidebarUserName').textContent = user.name;
                document.getElementById('sidebarUserAvatar').textContent = user.name.charAt(0).toUpperCase();
                // Mock role for now
                document.getElementById('sidebarUserRole').textContent = 'Year 2 • L.L.B'; 
            }
        });

        // Global functions for modal access
        window.showProfileModal = async function(event) {
            if (event) event.preventDefault();
            const modal = document.getElementById('profileModal');
            modal.classList.remove('hidden');
            // Reuse existing profile loading logic...
            // (Keeping implementation simple for layout step)
        };

        window.closeProfileModal = function() {
            document.getElementById('profileModal').classList.add('hidden');
        };
    </script>
    @stack('scripts')
</body>
</html>
