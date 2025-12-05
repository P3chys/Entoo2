/**
 * Authentication Check for Protected Pages
 *
 * This module runs on protected pages to verify the user has a valid token.
 * If no token exists or the token is invalid, redirects to /login.
 */

(function() {
    'use strict';

    // Don't run on auth pages (login, register, forgot-password, reset-password)
    const authPages = ['/login', '/register', '/forgot-password', '/reset-password'];
    const currentPath = window.location.pathname;

    if (authPages.some(page => currentPath.startsWith(page))) {
        // Skip auth check on authentication pages
        return;
    }

    // Check if token exists in localStorage
    const token = localStorage.getItem('token');

    if (!token) {
        // No token found, redirect to login
        // Store current URL for redirect after login
        const currentUrl = window.location.pathname + window.location.search;
        window.location.href = '/login?redirect=' + encodeURIComponent(currentUrl);
        return;
    }

    // Validate token by making a quick API call
    // We use /api/auth/user endpoint which is lightweight
    fetch('/api/auth/user', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        }
    })
    .then(response => {
        if (response.status === 401) {
            // Token is invalid or expired
            localStorage.removeItem('token');
            localStorage.removeItem('user');

            // Redirect to login with current URL
            const currentUrl = window.location.pathname + window.location.search;
            window.location.href = '/login?redirect=' + encodeURIComponent(currentUrl);
        } else if (!response.ok) {
            // Other error, but let it proceed (API might be temporarily down)
            console.warn('Auth check failed, but allowing page load:', response.status);
        }
        // If response.ok (200), token is valid, continue loading page
    })
    .catch(error => {
        // Network error, allow page to load
        // (better UX than blocking access due to network issues)
        console.warn('Auth check network error:', error);
    });
})();
