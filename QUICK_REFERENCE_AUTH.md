# Authentication & Toast Quick Reference

## Quick Start

```javascript
// Import modules (in Blade templates)
<script type="module">
import { auth } from '@/modules/auth.js';
import { toast } from '@/modules/toast.js';
</script>

// Or use globally (available everywhere after layout loads)
auth.isAuthenticated();
toast.success('Done!');
```

---

## Authentication Module (`auth`)

### Check Authentication

```javascript
// Is user logged in?
if (auth.isAuthenticated()) {
    // User is authenticated
}

// Get user data
const user = auth.getUser();
console.log(user.name, user.email, user.id);

// Get token
const token = auth.getToken();
```

### Logout

```javascript
// Standard logout with confirmation
await auth.handleLogout(event);

// Custom confirmation message
await auth.handleLogout(event, 'Save changes before logout?');

// Direct logout without confirmation
auth.logout();

// Logout with redirect URL for after login
auth.logout('/dashboard/important-page');
```

### API Requests

```javascript
// Authenticated GET request
const data = await auth.fetchAPI('/api/favorites');

// POST request
const result = await auth.fetchAPI('/api/favorites', {
    method: 'POST',
    body: JSON.stringify({ subject_name: 'Math' })
});

// DELETE request
await auth.fetchAPI(`/api/favorites/${id}`, {
    method: 'DELETE'
});

// PUT/PATCH request
await auth.fetchAPI('/api/profile', {
    method: 'PUT',
    body: JSON.stringify({ name: 'New Name' })
});
```

### Token Validation

```javascript
// Validate token with server
const isValid = await auth.validateToken();
if (!isValid) {
    auth.logout();
}
```

### Update UI

```javascript
// Update user info in sidebar
auth.updateSidebarUserInfo();
```

---

## Toast Notifications (`toast`)

### Basic Usage

```javascript
// Success (green, 4 seconds)
toast.success('File uploaded successfully!');

// Error (red, 6 seconds)
toast.error('Failed to save changes');

// Warning (orange, 5 seconds)
toast.warning('Session expiring soon');

// Info (blue, 4 seconds)
toast.info('New features available');
```

### Custom Duration

```javascript
// Short notification (2 seconds)
toast.success('Copied!', 2000);

// Long notification (10 seconds)
toast.error('Critical error occurred', 10000);

// Permanent (stays until dismissed)
toast.show('Important message', 'info', 0);
```

### Advanced Usage

```javascript
// Get toast element for manual control
const toastEl = toast.success('Processing...');

// Manually dismiss later
setTimeout(() => {
    toast.dismiss(toastEl);
}, 3000);
```

---

## Common Patterns

### Protected Page Load

```javascript
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    if (!auth.isAuthenticated()) {
        toast.warning('Please log in to continue');
        auth.logout();
        return;
    }

    // Load data
    try {
        const data = await auth.fetchAPI('/api/data');
        displayData(data);
        toast.success('Data loaded successfully');
    } catch (error) {
        toast.error('Failed to load data');
    }
});
```

### Form Submission

```javascript
async function handleSubmit(event) {
    event.preventDefault();

    const formData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value
    };

    try {
        const result = await auth.fetchAPI('/api/update', {
            method: 'POST',
            body: JSON.stringify(formData)
        });

        toast.success('Changes saved successfully!');

        // Redirect or update UI
        window.location.href = '/dashboard';
    } catch (error) {
        toast.error(error.message || 'Failed to save changes');
    }
}
```

### Delete with Confirmation

```javascript
async function deleteItem(itemId) {
    if (!confirm('Are you sure you want to delete this item?')) {
        return;
    }

    try {
        await auth.fetchAPI(`/api/items/${itemId}`, {
            method: 'DELETE'
        });

        toast.success('Item deleted successfully');

        // Remove from UI
        document.getElementById(`item-${itemId}`).remove();
    } catch (error) {
        toast.error('Failed to delete item');
    }
}
```

### File Upload

```javascript
async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    try {
        // Note: Don't set Content-Type for FormData
        const result = await fetch('/api/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${auth.getToken()}`
            },
            body: formData
        });

        if (!result.ok) throw new Error('Upload failed');

        toast.success(`${file.name} uploaded successfully`);
    } catch (error) {
        toast.error('Failed to upload file');
    }
}
```

### Logout Button

```javascript
// HTML
<button onclick="handleLogout(event)" class="btn-logout">
    Logout
</button>

// JavaScript
async function handleLogout(event) {
    await auth.handleLogout(event);
}
```

### Login Handler

```javascript
async function login(email, password) {
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            throw new Error('Invalid credentials');
        }

        const data = await response.json();

        // Store authentication
        auth.setAuth(data.token, data.user);

        // Update UI
        auth.updateSidebarUserInfo();

        // Show success
        toast.success(`Welcome back, ${data.user.name}!`);

        // Redirect
        const redirect = new URLSearchParams(window.location.search).get('redirect');
        window.location.href = redirect || '/dashboard';
    } catch (error) {
        toast.error(error.message);
    }
}
```

---

## Error Handling

### Try-Catch Pattern

```javascript
try {
    const data = await auth.fetchAPI('/api/endpoint');
    // Success handling
    toast.success('Operation completed');
} catch (error) {
    // Error handling
    toast.error(error.message || 'Operation failed');
    console.error('Error details:', error);
}
```

### Automatic 401 Handling

```javascript
// auth.fetchAPI() automatically handles 401 responses
// No need to check response.status === 401
// User will be logged out and redirected to login

try {
    const data = await auth.fetchAPI('/api/protected');
} catch (error) {
    // This only catches non-401 errors
    // 401 errors are handled automatically
    toast.error('An error occurred');
}
```

### Network Error Handling

```javascript
try {
    const data = await auth.fetchAPI('/api/endpoint');
} catch (error) {
    if (error.message === 'Unauthorized') {
        // User was logged out (401)
        // Already redirected, nothing to do
    } else if (error.message.includes('fetch')) {
        // Network error
        toast.error('Network error. Please check your connection.');
    } else {
        // Other error
        toast.error(error.message);
    }
}
```

---

## HTML Templates

### Logout Button

```html
<!-- In sidebar or header -->
<button onclick="handleLogout(event)"
        class="btn-logout"
        title="Logout">
    🚪
</button>
```

### User Profile Display

```html
<!-- User info display -->
<div class="user-profile-card" onclick="showProfileModal()">
    <div class="avatar" id="userAvatar">U</div>
    <div class="user-info">
        <span class="user-name" id="userName">User</span>
        <span class="user-role" id="userRole">Student</span>
    </div>
</div>

<script>
// Update on page load
document.addEventListener('DOMContentLoaded', () => {
    const user = auth.getUser();
    if (user) {
        document.getElementById('userName').textContent = user.name;
        document.getElementById('userRole').textContent = user.email;
        document.getElementById('userAvatar').textContent = user.name[0].toUpperCase();
    }
});
</script>
```

---

## Styling Classes

### User Profile Components

```css
/* User profile card */
.user-profile-card { /* Container */ }
.user-info { /* Text container */ }
.user-name { /* User name */ }
.user-role { /* User role/email */ }
.avatar { /* Avatar circle */ }
.btn-logout { /* Logout button */ }
```

### Toast Notifications

```css
/* Toast container (auto-created) */
#toastContainer { /* Fixed top-right */ }

/* Toast types (auto-applied) */
.toast-success { /* Green */ }
.toast-error { /* Red */ }
.toast-warning { /* Orange */ }
.toast-info { /* Blue */ }
```

---

## Troubleshooting

### Issue: "auth is not defined"

**Solution:**
```javascript
// Make sure you're using it after DOM load
document.addEventListener('DOMContentLoaded', () => {
    auth.isAuthenticated(); // Now it works
});

// Or check if it exists
if (typeof auth !== 'undefined') {
    auth.isAuthenticated();
}
```

### Issue: Module import fails

**Solution:**
```javascript
// Use correct import path with @ alias
import { auth } from '@/modules/auth.js';

// NOT this:
import { auth } from '../modules/auth.js';
```

### Issue: Toast not showing

**Solution:**
```javascript
// Make sure toast is loaded (check console for errors)
if (typeof toast !== 'undefined') {
    toast.success('It works!');
} else {
    console.error('Toast module not loaded');
}
```

### Issue: Logout not redirecting

**Solution:**
```javascript
// Make sure you're not preventing default
async function handleLogout(event) {
    // Don't do this:
    // event.preventDefault();

    // Do this:
    await auth.handleLogout(event);
    // handleLogout handles everything internally
}
```

---

## Best Practices

1. **Always use auth.fetchAPI()** for authenticated requests
2. **Use appropriate toast types** (success/error/warning/info)
3. **Keep toast messages concise** (1-2 sentences max)
4. **Handle errors gracefully** with try-catch
5. **Update UI after auth changes** with auth.updateSidebarUserInfo()
6. **Don't spam toasts** - one notification per significant action
7. **Use async/await** for better readability
8. **Clear localStorage only through auth module** for consistency

---

## Cheat Sheet

| Task | Code |
|------|------|
| Check if logged in | `auth.isAuthenticated()` |
| Get user data | `auth.getUser()` |
| Get token | `auth.getToken()` |
| Logout | `await auth.handleLogout(event)` |
| API GET | `await auth.fetchAPI('/api/endpoint')` |
| API POST | `await auth.fetchAPI('/api/endpoint', { method: 'POST', body: JSON.stringify(data) })` |
| Success toast | `toast.success('Message')` |
| Error toast | `toast.error('Message')` |
| Custom duration | `toast.success('Message', 3000)` |
| Update sidebar | `auth.updateSidebarUserInfo()` |

---

## API Reference

### auth Module

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `getToken()` | - | `string\|null` | Get auth token |
| `getUser()` | - | `Object\|null` | Get user data |
| `isAuthenticated()` | - | `boolean` | Check if authenticated |
| `setAuth(token, user)` | token, user object | `void` | Store auth data |
| `clearAuth()` | - | `void` | Clear auth data |
| `validateToken()` | - | `Promise<boolean>` | Validate with server |
| `logout(redirectUrl)` | redirect URL (optional) | `void` | Logout and redirect |
| `handleLogout(event, message)` | event, message (optional) | `Promise<boolean>` | Logout with confirmation |
| `fetchAPI(url, options)` | URL, fetch options | `Promise<any>` | Authenticated API call |
| `updateSidebarUserInfo()` | - | `void` | Update sidebar UI |

### toast Module

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `success(message, duration)` | message, duration (optional) | `HTMLElement` | Show success toast |
| `error(message, duration)` | message, duration (optional) | `HTMLElement` | Show error toast |
| `warning(message, duration)` | message, duration (optional) | `HTMLElement` | Show warning toast |
| `info(message, duration)` | message, duration (optional) | `HTMLElement` | Show info toast |
| `show(message, type, duration)` | message, type, duration | `HTMLElement` | Show custom toast |
| `dismiss(toastEl)` | toast element | `void` | Dismiss toast |

---

**Need more help?** See full documentation in:
- `webapp/resources/js/modules/README.md`
- `AUTH_ENHANCEMENTS_SUMMARY.md`
- `design-docs/auth-ui-showcase.md`
