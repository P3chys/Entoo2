/**
 * Authentication Module
 *
 * Centralized authentication utilities for managing user sessions,
 * token validation, and auth state across the application.
 */

export const auth = {
    /**
     * Get the current auth token
     * @returns {string|null}
     */
    getToken() {
        return localStorage.getItem('token');
    },

    /**
     * Get the current user data
     * @returns {Object|null}
     */
    getUser() {
        const userJson = localStorage.getItem('user');
        if (!userJson) return null;

        try {
            return JSON.parse(userJson);
        } catch (e) {
            console.error('Failed to parse user data:', e);
            return null;
        }
    },

    /**
     * Check if user is authenticated
     * @returns {boolean}
     */
    isAuthenticated() {
        return !!this.getToken();
    },

    /**
     * Set authentication data
     * @param {string} token
     * @param {Object} user
     */
    setAuth(token, user) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
    },

    /**
     * Clear authentication data
     */
    clearAuth() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    /**
     * Validate token with the server
     * @returns {Promise<boolean>}
     */
    async validateToken() {
        const token = this.getToken();
        if (!token) return false;

        try {
            const response = await fetch('/api/auth/user', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            return response.ok;
        } catch (error) {
            console.error('Token validation error:', error);
            return false;
        }
    },

    /**
     * Logout user and redirect to login
     * @param {string} redirectUrl - URL to redirect after login
     */
    logout(redirectUrl = null) {
        this.clearAuth();

        const loginUrl = redirectUrl
            ? `/login?redirect=${encodeURIComponent(redirectUrl)}`
            : '/login';

        window.location.href = loginUrl;
    },

    /**
     * Handle logout with confirmation
     * @param {Event} event - Optional event to stop propagation
     * @param {string} message - Custom confirmation message
     * @returns {Promise<boolean>}
     */
    async handleLogout(event = null, message = 'Are you sure you want to logout?') {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        // Show confirmation
        if (!confirm(message)) {
            return false;
        }

        // Show loading state
        this.showLogoutLoading();

        // Optional: Call API logout endpoint
        try {
            const token = this.getToken();
            if (token) {
                await fetch('/api/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                });
            }
        } catch (error) {
            console.warn('API logout failed:', error);
            // Continue with local logout even if API fails
        }

        // Clear local storage and redirect
        this.logout();
        return true;
    },

    /**
     * Show loading state during logout
     */
    showLogoutLoading() {
        // Create loading overlay
        const overlay = document.createElement('div');
        overlay.id = 'logoutOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            backdrop-filter: blur(4px);
        `;

        const spinner = document.createElement('div');
        spinner.style.cssText = `
            background: white;
            padding: 2rem 3rem;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            text-align: center;
            animation: fadeIn 0.2s ease;
        `;

        spinner.innerHTML = `
            <div style="
                width: 40px;
                height: 40px;
                border: 4px solid #e2e8f0;
                border-top-color: #2563eb;
                border-radius: 50%;
                margin: 0 auto 1rem;
                animation: spin 0.8s linear infinite;
            "></div>
            <p style="
                margin: 0;
                color: #1e293b;
                font-weight: 600;
                font-size: 1rem;
            ">Logging out...</p>
            <style>
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            </style>
        `;

        overlay.appendChild(spinner);
        document.body.appendChild(overlay);
    },

    /**
     * Make authenticated API request
     * @param {string} url
     * @param {Object} options
     * @returns {Promise<any>}
     */
    async fetchAPI(url, options = {}) {
        const token = this.getToken();

        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        // Handle 401 Unauthorized
        if (response.status === 401) {
            this.clearAuth();
            window.location.href = '/login?redirect=' + encodeURIComponent(window.location.href);
            throw new Error('Unauthorized');
        }

        // Handle other errors
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `HTTP ${response.status}`);
        }

        return await response.json();
    },

    /**
     * Update user info in sidebar
     */
    updateSidebarUserInfo() {
        const user = this.getUser();
        if (!user) return;

        // Update user name
        const userName = document.getElementById('sidebarUserName');
        if (userName) {
            userName.textContent = user.name || 'User';
        }

        // Update user avatar
        const userAvatar = document.getElementById('sidebarUserAvatar');
        if (userAvatar && user.name) {
            userAvatar.textContent = user.name.charAt(0).toUpperCase();
        }

        // Update user role/email
        const userRole = document.getElementById('sidebarUserRole');
        if (userRole) {
            userRole.textContent = user.email || 'Student';
        }
    },

    /**
     * Initialize auth state on page load
     */
    init() {
        if (this.isAuthenticated()) {
            this.updateSidebarUserInfo();
        }
    }
};

// Make auth available globally
window.auth = auth;

// Auto-initialize on DOM load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => auth.init());
} else {
    auth.init();
}
