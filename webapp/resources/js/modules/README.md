# JavaScript Modules

This directory contains reusable JavaScript modules for the Entoo application.

## Available Modules

### auth.js - Authentication Module

Centralized authentication utilities for managing user sessions, token validation, and auth state.

**Features:**
- Token management (get, set, clear)
- User data management
- Token validation with server
- Enhanced logout with loading states
- Authenticated API requests
- Sidebar user info updates

**Usage:**

```javascript
import { auth } from '@/modules/auth.js';

// Check if user is authenticated
if (auth.isAuthenticated()) {
    const user = auth.getUser();
    console.log('Logged in as:', user.name);
}

// Logout with confirmation
await auth.handleLogout(event);

// Make authenticated API request
try {
    const data = await auth.fetchAPI('/api/favorites');
    console.log('Favorites:', data);
} catch (error) {
    console.error('API error:', error);
}

// Update sidebar user info
auth.updateSidebarUserInfo();
```

**API Reference:**

- `getToken()` - Get the current auth token
- `getUser()` - Get the current user data object
- `isAuthenticated()` - Check if user is authenticated
- `setAuth(token, user)` - Set authentication data
- `clearAuth()` - Clear authentication data
- `validateToken()` - Validate token with server (async)
- `logout(redirectUrl)` - Logout and redirect to login
- `handleLogout(event, message)` - Logout with confirmation (async)
- `showLogoutLoading()` - Display loading overlay during logout
- `fetchAPI(url, options)` - Make authenticated API request (async)
- `updateSidebarUserInfo()` - Update user info in sidebar
- `init()` - Initialize auth state (called automatically)

### toast.js - Toast Notification System

Elegant, non-intrusive toast notifications for user feedback.

**Features:**
- Multiple notification types (success, error, warning, info)
- Auto-dismiss with configurable duration
- Manual dismiss with close button
- Stacked notifications
- Smooth animations
- XSS protection

**Usage:**

```javascript
import { toast } from '@/modules/toast.js';

// Show success message
toast.success('File uploaded successfully!');

// Show error message
toast.error('Failed to save changes');

// Show warning
toast.warning('Your session will expire in 5 minutes');

// Show info
toast.info('New features available!');

// Custom duration (0 = permanent until dismissed)
toast.success('Changes saved', 3000);

// Generic show method
toast.show('Custom message', 'info', 5000);
```

**API Reference:**

- `show(message, type, duration)` - Show a toast notification
- `success(message, duration)` - Show success toast (default: 4s)
- `error(message, duration)` - Show error toast (default: 6s)
- `warning(message, duration)` - Show warning toast (default: 5s)
- `info(message, duration)` - Show info toast (default: 4s)
- `dismiss(toastEl)` - Manually dismiss a toast

**Toast Types:**

- `success` - Green background, checkmark icon
- `error` - Red background, X icon
- `warning` - Orange background, warning icon
- `info` - Blue background, info icon

## Integration

These modules are automatically loaded in the main layout (`layouts/app.blade.php`) and made available globally via `window.auth` and `window.toast`.

### Vite Configuration

Modules are included in the Vite build configuration with path aliasing:

```javascript
// vite.config.js
resolve: {
    alias: {
        '@': path.resolve(__dirname, './resources/js'),
    },
}
```

### Import in Blade Templates

```html
<script type="module">
    import { auth } from '@/modules/auth.js';
    import { toast } from '@/modules/toast.js';

    // Your code here
</script>
```

### Global Access

Both modules are available globally:

```javascript
// Anywhere in your application
window.auth.isAuthenticated();
window.toast.success('Done!');
```

## Best Practices

### Authentication

1. **Always check authentication** before making API requests
2. **Use auth.fetchAPI()** for authenticated requests (handles 401 automatically)
3. **Update UI** after auth state changes
4. **Handle errors gracefully** with try/catch blocks

### Toast Notifications

1. **Use appropriate types** (success for confirmations, error for failures)
2. **Keep messages concise** (1-2 short sentences)
3. **Use consistent tone** across the application
4. **Don't spam** - limit notifications to important events
5. **Consider duration** - errors should be visible longer than success messages

## Examples

### Complete Login Flow

```javascript
async function handleLogin(email, password) {
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            toast.error(data.message || 'Login failed');
            return;
        }

        // Store auth data
        auth.setAuth(data.token, data.user);

        // Update UI
        auth.updateSidebarUserInfo();

        // Show success
        toast.success(`Welcome back, ${data.user.name}!`);

        // Redirect
        window.location.href = '/dashboard';
    } catch (error) {
        toast.error('Network error. Please try again.');
    }
}
```

### Protected API Request

```javascript
async function loadFavorites() {
    if (!auth.isAuthenticated()) {
        toast.warning('Please log in to view favorites');
        window.location.href = '/login';
        return;
    }

    try {
        const data = await auth.fetchAPI('/api/favorites');

        // Process data
        displayFavorites(data.favorites);

        toast.info(`Loaded ${data.favorites.length} favorites`);
    } catch (error) {
        toast.error('Failed to load favorites');
    }
}
```

### Logout with Confirmation

```javascript
// Simple logout (uses built-in confirmation)
document.getElementById('logoutBtn').addEventListener('click', async (e) => {
    await auth.handleLogout(e);
});

// Custom confirmation message
async function customLogout(event) {
    await auth.handleLogout(event, 'Your changes will be saved. Continue?');
}
```

## Testing

GUI tests for these modules are located in:
- `tests/tests/gui/auth-enhancements.spec.ts`

Run tests:
```bash
cd tests
npm test tests/gui/auth-enhancements.spec.ts
```

## Browser Compatibility

Both modules use modern JavaScript features and are compatible with:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

For older browsers, Vite will automatically transpile the code.
