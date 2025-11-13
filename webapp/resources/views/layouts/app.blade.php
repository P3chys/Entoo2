<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>@yield('title', 'Entoo - Document Management')</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    @stack('styles')
</head>
<body>
    <nav class="navbar glass-navbar">
        <div class="container">
            <div class="navbar-brand">
                <a href="/" style="text-decoration: none; color: inherit; display: flex; align-items: center; gap: var(--spacing-md);">
                    <div style="width: 36px; height: 36px; background: var(--primary-600); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: 1.25rem; color: white;">
                        📚
                    </div>
                    <h1 style="margin: 0;">Entoo</h1>
                </a>
            </div>
            <div class="navbar-menu" id="navbarMenu">
                <!-- Theme Toggle (always visible) -->
                <button onclick="toggleTheme()" class="theme-toggle" id="themeToggle" aria-label="Toggle dark mode" title="Toggle theme">
                    <span class="theme-toggle-icon" id="themeIcon">🌙</span>
                </button>
                <!-- Guest links (shown when not logged in) -->
                <div id="guestLinks" style="display: flex; gap: var(--spacing-md); align-items: center;">
                    <a href="/login" class="nav-link">Login</a>
                    <a href="/register" class="nav-link btn-primary">Get Started</a>
                </div>
                <!-- Authenticated links (shown when logged in) -->
                <div id="authLinks" style="display: none; gap: var(--spacing-md); align-items: center;">
                    <a href="/dashboard" class="nav-link">
                        Dashboard
                    </a>
                    <a href="/admin" class="nav-link" id="adminLink" style="display: none;">
                        Admin
                    </a>
                    <div class="divider-vertical" style="height: 24px;"></div>
                    <a href="#" onclick="showProfileModal(event)" class="nav-link user-profile-link" id="userInfo">
                        <div class="avatar avatar-sm" id="userAvatar"></div>
                        <span id="userName"></span>
                    </a>
                    <button onclick="logout()" class="btn btn-danger nav-link">
                        Logout
                    </button>
                </div>
            </div>
        </div>
    </nav>

    <main class="main-content">
        @yield('content')
    </main>

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

    <footer class="footer">
        <div class="container">
            <p>&copy; 2025 Entoo. All rights reserved.</p>
        </div>
    </footer>

    <script>
        // Theme Management
        function initTheme() {
            const savedTheme = localStorage.getItem('theme') || 'light';
            const htmlElement = document.documentElement;
            const themeIcon = document.getElementById('themeIcon');

            htmlElement.setAttribute('data-theme', savedTheme);
            if (themeIcon) {
                themeIcon.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
            }
        }

        function toggleTheme() {
            const htmlElement = document.documentElement;
            const currentTheme = htmlElement.getAttribute('data-theme') || 'light';
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            const themeIcon = document.getElementById('themeIcon');

            // Add rotation animation
            if (themeIcon) {
                themeIcon.classList.add('rotate');
                setTimeout(() => {
                    themeIcon.classList.remove('rotate');
                }, 500);
            }

            // Update theme
            htmlElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);

            // Update icon
            if (themeIcon) {
                themeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
            }
        }

        // Initialize theme before page load completes
        initTheme();

        // Update navbar based on authentication status
        function updateNavbar() {
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const guestLinks = document.getElementById('guestLinks');
            const authLinks = document.getElementById('authLinks');
            const userAvatar = document.getElementById('userAvatar');
            const userName = document.getElementById('userName');
            const adminLink = document.getElementById('adminLink');

            if (token && user) {
                guestLinks.style.display = 'none';
                authLinks.style.display = 'flex';

                const name = user.name || user.email || 'User';
                if (userName) {
                    userName.textContent = name;
                }
                if (userAvatar) {
                    userAvatar.textContent = name.charAt(0).toUpperCase();
                }

                // Show admin link if user is admin
                if (adminLink) {
                    adminLink.style.display = user.is_admin ? 'inline-flex' : 'none';
                }
            } else {
                guestLinks.style.display = 'flex';
                authLinks.style.display = 'none';
            }
        }

        // Update navbar on page load
        updateNavbar();

        // Profile Modal Functions
        async function showProfileModal(event) {
            if (event) event.preventDefault();

            const modal = document.getElementById('profileModal');
            const content = document.getElementById('profileContent');

            modal.classList.remove('hidden');
            content.innerHTML = '<div class="loading">Loading profile...</div>';

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
                displayProfile(data);
            } catch (error) {
                content.innerHTML = '<div class="alert alert-error">Failed to load profile</div>';
            }
        }

        function displayProfile(data) {
            const content = document.getElementById('profileContent');
            const user = data.user;
            const stats = data.stats;

            content.innerHTML = `
                <div style="text-align: center; margin-bottom: var(--spacing-xl);">
                    <div style="width: 80px; height: 80px; border-radius: 50%; background: var(--primary-600); color: white; display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: 700; margin: 0 auto var(--spacing-md);">
                        ${user.name.charAt(0).toUpperCase()}
                    </div>
                    <h3 style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin-bottom: var(--spacing-xs);">${user.name}</h3>
                    <p style="color: var(--text-secondary); font-size: 0.875rem;">${user.email}</p>
                </div>

                <div class="stats-grid" style="margin-bottom: var(--spacing-xl); grid-template-columns: repeat(2, 1fr);">
                    <div class="stat-card glass-stat-card">
                        <h3>${stats.total_files}</h3>
                        <p>Files Uploaded</p>
                    </div>
                    <div class="stat-card glass-stat-card">
                        <h3>${stats.total_size_formatted}</h3>
                        <p>Storage Used</p>
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; gap: var(--spacing-md);">
                    <button onclick="viewMyFiles()" class="btn btn-primary btn-block">
                        📁 View My Files
                    </button>
                    <button onclick="changePassword()" class="btn btn-secondary btn-block">
                        🔒 Change Password
                    </button>
                </div>
            `;
        }

        function closeProfileModal() {
            document.getElementById('profileModal').classList.add('hidden');
        }

        function changePassword() {
            const password = prompt('Enter new password:');
            if (!password) return;

            const confirmPassword = prompt('Confirm new password:');
            if (password !== confirmPassword) {
                alert('Passwords do not match');
                return;
            }

            const currentPassword = prompt('Enter current password:');
            if (!currentPassword) return;

            const token = localStorage.getItem('token');
            fetch('/api/change-password', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: password,
                    new_password_confirmation: confirmPassword
                })
            })
            .then(response => response.json())
            .then(data => {
                alert(data.message || 'Password changed successfully. Please log in again.');
                logout();
            })
            .catch(error => {
                alert('Failed to change password. Please check your current password.');
            });
        }

        function viewMyFiles() {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            closeProfileModal();
            if (user.id && window.filterByUser) {
                window.filterByUser(user.id, user.name);
            } else {
                window.location.href = '/dashboard';
            }
        }

        // Logout function
        function logout() {
            // Clear authentication data from localStorage
            localStorage.removeItem('token');
            localStorage.removeItem('user');

            // Redirect to login page
            window.location.href = '/login';
        }
    </script>
    @stack('scripts')
</body>
</html>
