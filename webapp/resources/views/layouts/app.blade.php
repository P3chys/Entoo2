<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>@yield('title', 'Entoo')</title>
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
                    <h1>Entoo</h1>
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
                    <button class="btn-logout" onclick="handleLogout(event)" title="Logout">🚪</button>
                </div>
            </div>
        </aside>

        <!-- Main Content Area -->
        <div class="main-wrapper">
            <!-- Top Navbar -->
            <header class="top-navbar">
                <div class="search-container">
                    <div>
                        <span class="search-icon">🔍</span>
                        <input type="text" id="globalSearch" placeholder="Global Search..." class="search-input">
                    </div>
                    <div class="search-options">
                        <label class="search-option">
                            <input type="checkbox" id="searchInFilename" checked>
                            <span>Filename</span>
                        </label>
                        <label class="search-option">
                            <input type="checkbox" id="searchInContent" checked>
                            <span>Content</span>
                        </label>
                    </div>
                </div>

                <div class="navbar-actions">
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

    <script type="module">
        // Import auth and toast modules
        import { auth } from '@/modules/auth.js';
        import { toast } from '@/modules/toast.js';

        // Make globally available
        window.auth = auth;
        window.toast = toast;

        // Theme Toggle Logic
        window.toggleTheme = function() {
            const html = document.documentElement;
            const current = html.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';

            html.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);

            updateThemeIcon(next);
            toast.success(`Switched to ${next} mode`);
        };

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

            // Update user info using auth module
            auth.updateSidebarUserInfo();
        });

        // Global functions for modal access
        window.showProfileModal = async function(event) {
            if (event) event.preventDefault();
            const modal = document.getElementById('profileModal');
            const content = document.getElementById('profileContent');
            modal.classList.remove('hidden');

            // Load profile data from API
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('/api/profile', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                });

                if (!response.ok) throw new Error('Failed to load profile');

                const data = await response.json();
                const user = data.user;
                const totalFiles = data.statistics?.total_files || 0;

                // Render profile content
                content.innerHTML = `
                    <div style="text-align: center; margin-bottom: 2rem;">
                        <div class="avatar" style="width: 80px; height: 80px; font-size: 2rem; margin: 0 auto 1rem;">${user.name.charAt(0).toUpperCase()}</div>
                        <h3 style="margin: 0 0 0.5rem;">${user.name}</h3>
                        <p style="color: var(--text-secondary); margin: 0;">${user.email}</p>
                    </div>

                    <div class="profile-info" style="display: grid; gap: 1rem; margin-bottom: 1.5rem;">
                        <div class="info-group">
                            <label style="display: block; color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 0.25rem;">Account Created</label>
                            <div style="font-weight: 500;">${new Date(user.created_at).toLocaleDateString()}</div>
                        </div>

                        <div class="info-group">
                            <label style="display: block; color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 0.25rem;">Files Uploaded</label>
                            <div style="font-weight: 500;">${totalFiles} file${totalFiles !== 1 ? 's' : ''}</div>
                        </div>

                        <div class="info-group">
                            <label style="display: block; color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 0.25rem;">User ID</label>
                            <div style="font-weight: 500; font-family: monospace;">#${user.id}</div>
                        </div>
                    </div>

                    <button onclick="showChangePasswordForm()" class="btn btn-secondary" style="width: 100%;">
                        🔒 Change Password
                    </button>
                `;
            } catch (error) {
                content.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: var(--error);">
                        <p>Failed to load profile</p>
                        <p style="font-size: 0.875rem; margin-top: 0.5rem;">${error.message}</p>
                    </div>
                `;
            }
        };

        window.closeProfileModal = function() {
            document.getElementById('profileModal').classList.add('hidden');
        };

        window.handleLogout = async function(event) {
            // Use the enhanced auth module logout
            await auth.handleLogout(event);
        };

        window.showChangePasswordForm = function() {
            const content = document.getElementById('profileContent');

            content.innerHTML = `
                <div style="margin-bottom: 1rem;">
                    <button onclick="showProfileModal()" class="btn btn-text" style="padding: 0;">
                        ← Back to Profile
                    </button>
                </div>

                <h3 style="margin: 0 0 1.5rem; text-align: center;">Change Password</h3>

                <form id="changePasswordForm" style="display: grid; gap: 1rem;">
                    <div class="form-group">
                        <label style="display: block; margin-bottom: 0.5rem;">Current Password</label>
                        <input type="password" id="currentPassword" name="current_password" required
                               style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-primary); border-radius: var(--radius-md); background: var(--bg-primary); color: var(--text-primary);">
                    </div>

                    <div class="form-group">
                        <label style="display: block; margin-bottom: 0.5rem;">New Password</label>
                        <input type="password" id="newPassword" name="new_password" required minlength="8"
                               style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-primary); border-radius: var(--radius-md); background: var(--bg-primary); color: var(--text-primary);">
                        <small style="color: var(--text-secondary); font-size: 0.8rem;">Minimum 8 characters</small>
                    </div>

                    <div class="form-group">
                        <label style="display: block; margin-bottom: 0.5rem;">Confirm New Password</label>
                        <input type="password" id="confirmPassword" name="new_password_confirmation" required
                               style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-primary); border-radius: var(--radius-md); background: var(--bg-primary); color: var(--text-primary);">
                    </div>

                    <div id="passwordError" style="color: var(--error); display: none; padding: 0.75rem; background: rgba(239, 68, 68, 0.1); border-radius: var(--radius-md);"></div>

                    <button type="submit" class="btn btn-primary" style="width: 100%;">
                        Change Password
                    </button>
                </form>
            `;

            // Handle form submission
            document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
                e.preventDefault();

                const currentPassword = document.getElementById('currentPassword').value;
                const newPassword = document.getElementById('newPassword').value;
                const confirmPassword = document.getElementById('confirmPassword').value;
                const errorDiv = document.getElementById('passwordError');

                // Validate passwords match
                if (newPassword !== confirmPassword) {
                    errorDiv.textContent = 'New passwords do not match';
                    errorDiv.style.display = 'block';
                    return;
                }

                try {
                    const token = localStorage.getItem('token');
                    const response = await fetch('/api/change-password', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            current_password: currentPassword,
                            new_password: newPassword,
                            new_password_confirmation: confirmPassword
                        })
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        errorDiv.textContent = data.message || 'Failed to change password';
                        errorDiv.style.display = 'block';
                        return;
                    }

                    // Success - logout and redirect to login
                    alert('Password changed successfully! Please log in again.');
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = '/login';
                } catch (error) {
                    errorDiv.textContent = 'An error occurred: ' + error.message;
                    errorDiv.style.display = 'block';
                }
            });
        };
    </script>
    @stack('scripts')
</body>
</html>
