# Frontend JavaScript Modules

## Quick Reference

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| **App Entry** | `app.js` | ~2 | Main entry point, imports bootstrap |
| **Dashboard** | `dashboard.js` | ~1200+ | File tree, favorites, search, main UI logic |
| **File Upload** | `file-upload.js` | ~300+ | Upload modal, file processing status polling |
| **Admin Panel** | `admin.js` | ~800+ | Admin dashboard, user/file management |
| **Subject Profiles** | `subject-profile-modal.js` | ~250+ | Profile view/edit modal functionality |
| **Profile Renderer** | `subject-profile-renderer.js` | ~200+ | Shared profile rendering logic |
| **Bootstrap** | `bootstrap.js` | minimal | Axios/dependencies setup |

---

## Architecture Overview

### Module Pattern

All JavaScript modules follow a consistent pattern:
- **Module Scope:** Each file is an ES6 module
- **Global Functions:** Critical functions exposed via `window` object
- **State Management:** Module-level state variables
- **API Communication:** Centralized `fetchAPI()` helper
- **XSS Protection:** All HTML sanitized with DOMPurify

### File Organization

```
resources/js/
├── app.js                      # Entry point (imported by Vite)
├── bootstrap.js                # Dependencies and Axios setup
├── dashboard.js                # Main dashboard functionality
├── file-upload.js              # File upload modal
├── admin.js                    # Admin panel
├── subject-profile-modal.js    # Profile modal interactions
└── subject-profile-renderer.js # Shared profile rendering
```

---

## 1. App Entry Point

**File:** `resources/js/app.js`

**Purpose:** Main entry point for Vite build system

---

### Implementation

```javascript
import './bootstrap';
```

**Build Output:**
- Compiled to `public/build/assets/app-{hash}.js`
- Included in Blade templates via `@vite('resources/js/app.js')`

---

## 2. Dashboard Module

**File:** `resources/js/dashboard.js`

**Purpose:** Core dashboard functionality including file tree, favorites, search, and navigation

**Dependencies:**
- DOMPurify (XSS protection)
- subject-profile-renderer.js

---

### Global State

```javascript
let allFiles = [];        // All files from API
let subjectFiles = {};    // Cache for loaded subject files
let favorites = [];       // User's favorite subjects
let searchMode = false;   // Search mode flag

// Route parameters set by Blade template
window.dashboardRouteParams = window.dashboardRouteParams || {};
```

---

### Key Functions

#### loadDashboard()

**Purpose:** Initialize dashboard with all data

**Exposed:** `window.loadDashboard`

**Flow:**
```javascript
async function loadDashboard() {
    // 1. Load favorites FIRST (needed for sorting)
    await loadFavorites();

    // 2. Load files and stats in parallel
    await Promise.all([
        loadFiles(),
        loadStats()
    ]);

    // 3. Handle route parameters
    const routeParams = window.dashboardRouteParams;
    if (routeParams.searchQuery) {
        performSearchFromRoute();
    } else if (routeParams.profileSubject) {
        window.viewSubjectProfile(routeParams.profileSubject, {...});
    } else if (routeParams.filterUserId) {
        filterByOwnerFromRoute();
    } else if (routeParams.selectedSubject) {
        expandSubjectFromRoute();
    }
}
```

**Called By:**
- `dashboard-enhanced.blade.php` on page load
- File upload success callback
- After profile updates

---

#### toggleFavorite()

**Purpose:** Toggle subject favorite status with optimistic UI updates

**Exposed:** `window.toggleFavorite`

**Parameters:**
- `subjectName` - Subject to favorite/unfavorite
- `event` - Click event (for star element)

**Implementation:**
```javascript
window.toggleFavorite = async function(subjectName, event) {
    event.stopPropagation();

    const favorite = favorites.find(f => f.subject_name === subjectName);
    const isRemoving = !!favorite;
    const starElement = event.currentTarget;

    // Add pop animation
    starElement.classList.add('animating');
    setTimeout(() => starElement.classList.remove('animating'), 300);

    // Optimistic update - update star icon immediately
    if (isRemoving) {
        starElement.textContent = '☆';
        starElement.classList.remove('active');
        starElement.title = 'Add to favorites';
        favorites = favorites.filter(f => f.id !== favorite.id);
    } else {
        starElement.textContent = '★';
        starElement.classList.add('active');
        starElement.title = 'Remove from favorites';
        favorites.push({ id: -1, subject_name: subjectName });
    }

    // Update counter instantly
    updateFavoriteCount();

    // Make API call in background
    try {
        if (isRemoving) {
            await fetchAPI(`/api/favorites/${favorite.id}`, { method: 'DELETE' });
        } else {
            const response = await fetchAPI('/api/favorites', {
                method: 'POST',
                body: JSON.stringify({ subject_name: subjectName })
            });
            // Replace temporary favorite with real one
            favorites = favorites.filter(f => f.subject_name !== subjectName);
            favorites.push(response.favorite);
        }

        // Rebuild tree after API call succeeds (to reorder subjects)
        buildTreeStructure(allFiles);
    } catch (error) {
        // Revert star icon on error
        if (isRemoving) {
            starElement.textContent = '★';
            starElement.classList.add('active');
            favorites.push(favorite);
        } else {
            starElement.textContent = '☆';
            starElement.classList.remove('active');
            favorites = favorites.filter(f => f.subject_name !== subjectName);
        }
        updateFavoriteCount();
        console.error('Failed to toggle favorite:', error);
    }
}
```

**UI Flow:**
1. User clicks star
2. Star animates (pop effect)
3. Icon changes immediately (optimistic)
4. Counter updates
5. API call in background
6. On success: Rebuild tree (favorites at top)
7. On error: Revert UI changes

---

#### sanitizeHTML()

**Purpose:** Prevent XSS attacks via DOMPurify

**Parameters:**
- `html` - Raw HTML string

**Returns:** Sanitized HTML string

**Implementation:**
```javascript
function sanitizeHTML(html) {
    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['div', 'span', 'p', 'strong', 'button', 'a', 'h3', 'h4'],
        ALLOWED_ATTR: ['class', 'style', 'onclick', 'title', 'href', 'id',
                       'data-subject', 'data-file-id', 'data-filename']
    });
}
```

**Security:**
- Whitelist approach (only allowed tags/attributes)
- Prevents `<script>` injection
- Prevents `javascript:` URLs
- Allows safe onclick for UI interactions

---

#### checkAuth()

**Purpose:** Verify user is authenticated, redirect to login if not

**Implementation:**
```javascript
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
        return;
    }
}
```

**Called:** On dashboard load

---

### Route Parameter Handling

**Supported Routes:**

| Route | Parameter | Function Called | Purpose |
|-------|-----------|-----------------|---------|
| `/dashboard/search?q=...` | `searchQuery` | `performSearchFromRoute()` | Load with search results |
| `/dashboard/subject/{subject}` | `selectedSubject` | `expandSubjectFromRoute()` | Expand specific subject |
| `/dashboard/profile/{subject}` | `profileSubject` | `viewSubjectProfile()` | Show subject profile |
| `/dashboard/user/{userId}` | `filterUserId` | `filterByOwnerFromRoute()` | Filter by file owner |

**Example:**
```blade
<!-- dashboard-enhanced.blade.php -->
<script>
    window.dashboardRouteParams = {
        searchQuery: "{{ $searchQuery ?? '' }}",
        selectedSubject: "{{ $selectedSubject ?? '' }}",
        profileSubject: "{{ $profileSubject ?? '' }}",
        filterUserId: "{{ $filterUserId ?? '' }}"
    };
</script>
```

---

## 3. File Upload Module

**File:** `resources/js/file-upload.js`

**Purpose:** Handle file upload modal and processing status polling

---

### State Variables

```javascript
let currentUploadSubject = '';
let currentUploadCategory = '';
```

**Purpose:** Store context for contextual uploads (from file tree)

---

### Key Functions

#### openUploadModal()

**Purpose:** Open upload modal for specific subject/category

**Exposed:** `window.openUploadModal`

**Parameters:**
- `subject` - Subject name
- `category` - Category name

**Implementation:**
```javascript
window.openUploadModal = function(subject, category) {
    currentUploadSubject = subject;
    currentUploadCategory = category;

    // Show context mode (hide dropdowns)
    document.getElementById('uploadContext').style.display = 'block';
    document.getElementById('uploadSelectors').style.display = 'none';
    document.getElementById('categorySelectGroup').style.display = 'none';

    // Remove required from hidden fields
    document.getElementById('subjectSelect').removeAttribute('required');
    document.getElementById('categorySelect').removeAttribute('required');

    // Display context
    document.getElementById('uploadSubject').textContent = subject;
    document.getElementById('uploadCategory').textContent = category;

    document.getElementById('uploadModal').classList.remove('hidden');
    document.getElementById('uploadForm').reset();
    document.getElementById('uploadError').classList.add('hidden');
    document.getElementById('uploadSuccess').classList.add('hidden');
}
```

**UI Mode:** Contextual upload (subject/category pre-selected)

---

#### openUploadModalGlobal()

**Purpose:** Open upload modal with subject/category selectors

**Exposed:** `window.openUploadModalGlobal`

**Implementation:**
```javascript
window.openUploadModalGlobal = function() {
    currentUploadSubject = '';
    currentUploadCategory = '';

    // Show selector mode (show dropdowns)
    document.getElementById('uploadContext').style.display = 'none';
    document.getElementById('uploadSelectors').style.display = 'block';
    document.getElementById('categorySelectGroup').style.display = 'block';

    // Add required to visible fields
    document.getElementById('subjectSelect').setAttribute('required', 'required');
    document.getElementById('categorySelect').setAttribute('required', 'required');

    // Populate subject dropdown from dashboard data
    const subjectSelect = document.getElementById('subjectSelect');
    subjectSelect.innerHTML = '<option value="">Select a subject...</option>';

    if (typeof window.allFiles !== 'undefined') {
        const subjects = Object.keys(window.allFiles).sort();
        subjects.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject;
            option.textContent = subject;
            subjectSelect.appendChild(option);
        });
    }

    document.getElementById('uploadModal').classList.remove('hidden');
    document.getElementById('uploadForm').reset();
    document.getElementById('uploadError').classList.add('hidden');
    document.getElementById('uploadSuccess').classList.add('hidden');
}
```

**UI Mode:** Global upload (user selects subject/category)

---

#### pollProcessingStatus()

**Purpose:** Poll file processing status after upload

**Parameters:**
- `fileId` - ID of uploaded file

**Implementation:**
```javascript
async function pollProcessingStatus(fileId) {
    const progressText = document.getElementById('progressText');
    const progressFill = document.getElementById('progressFill');
    const uploadError = document.getElementById('uploadError');
    const uploadSuccess = document.getElementById('uploadSuccess');

    let attempts = 0;
    const maxAttempts = 60; // Poll for up to 1 minute (60 * 1 second)

    const poll = async () => {
        attempts++;

        try {
            const response = await fetch(`/api/files/${fileId}/status`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Accept': 'application/json'
                }
            });

            const data = await response.json();

            if (data.processing_status === 'completed') {
                // Processing completed successfully
                progressFill.style.width = '100%';
                progressText.textContent = 'Processing complete!';
                uploadSuccess.textContent = 'File uploaded and processed successfully!';
                uploadSuccess.classList.remove('hidden');

                setTimeout(() => {
                    closeUploadModal();
                    if (typeof loadDashboard === 'function') {
                        loadDashboard();
                    }
                }, 1500);
            } else if (data.processing_status === 'failed') {
                // Processing failed
                progressFill.style.width = '100%';
                progressFill.style.backgroundColor = 'var(--color-danger)';
                uploadError.textContent = `Processing failed: ${data.processing_error || 'Unknown error'}`;
                uploadError.classList.remove('hidden');
                document.getElementById('uploadBtn').disabled = false;
                document.getElementById('uploadProgress').classList.add('hidden');
            } else if (data.processing_status === 'processing') {
                // Still processing - update progress
                const progress = Math.min(50 + (attempts * 2), 90); // Simulate progress 50% -> 90%
                progressFill.style.width = `${progress}%`;
                progressText.textContent = 'Processing file content...';

                if (attempts < maxAttempts) {
                    setTimeout(poll, 1000); // Poll again in 1 second
                } else {
                    // Timeout
                    uploadError.textContent = 'Processing is taking longer than expected. Please check back later.';
                    uploadError.classList.remove('hidden');
                    document.getElementById('uploadBtn').disabled = false;
                }
            } else if (data.processing_status === 'pending') {
                // Still pending - update progress
                const progress = Math.min(10 + (attempts * 2), 50); // Simulate progress 10% -> 50%
                progressFill.style.width = `${progress}%`;
                progressText.textContent = 'Queued for processing...';

                if (attempts < maxAttempts) {
                    setTimeout(poll, 1000); // Poll again in 1 second
                } else {
                    uploadError.textContent = 'Processing is taking longer than expected.';
                    uploadError.classList.remove('hidden');
                    document.getElementById('uploadBtn').disabled = false;
                }
            }
        } catch (error) {
            uploadError.textContent = 'Failed to check processing status';
            uploadError.classList.remove('hidden');
            document.getElementById('uploadBtn').disabled = false;
        }
    };

    // Start polling
    poll();
}
```

**Polling Strategy:**
- Interval: 1 second
- Max attempts: 60 (1 minute total)
- Progress bar simulation:
  - `pending`: 10% → 50%
  - `processing`: 50% → 90%
  - `completed`: 100%

**Status Handling:**
- `completed` → Success message, close modal, reload dashboard
- `failed` → Error message, show error details
- `processing` → Update progress bar, continue polling
- `pending` → Update progress bar, continue polling
- Timeout → Show warning message

---

## 4. Admin Panel Module

**File:** `resources/js/admin.js`

**Purpose:** Admin dashboard with user and file management

---

### AdminDashboard Class

```javascript
class AdminDashboard {
    constructor() {
        this.currentTab = 'users';
        this.currentPage = {
            users: 1,
            files: 1
        };
        this.filters = {
            users: { search: '' },
            files: { search: '', subject: '', category: '' }
        };
        this.editingUserId = null;

        this.init();
    }

    init() {
        this.bindEvents();
        this.loadStats();
        this.loadUsers();
        this.checkAdminAccess();
    }
}
```

**Instantiation:**
```javascript
// admin.dashboard.blade.php
document.addEventListener('DOMContentLoaded', () => {
    new AdminDashboard();
});
```

---

### Key Methods

#### checkAdminAccess()

**Purpose:** Verify user has admin privileges, redirect if not

**Implementation:**
```javascript
async checkAdminAccess() {
    try {
        const response = await apiRequest('/api/user');
        const user = response.user || response;

        if (!user || !user.is_admin) {
            window.location.href = '/dashboard';
            return;
        }
    } catch (error) {
        console.error('Error checking admin access:', error);
        window.location.href = '/login';
    }
}
```

**Security:**
- Client-side check (UX only)
- Server-side enforcement via `admin` middleware on all API endpoints
- Redirects non-admins to dashboard
- Redirects unauthenticated to login

---

#### loadStats()

**Purpose:** Load admin dashboard statistics

**API:** `GET /api/admin/stats`

**Displays:**
- Total users
- Total files
- Total subjects
- Total storage
- System health (DB, Redis, Elasticsearch)

---

#### loadUsers()

**Purpose:** Load paginated user list with search

**API:** `GET /api/admin/users?page={page}&search={search}`

**Features:**
- Pagination (20 users per page)
- Search by name or email (debounced 500ms)
- Actions: Edit, Delete
- Shows: ID, Name, Email, Admin status, Created date

---

#### loadFiles()

**Purpose:** Load paginated file list with filters

**API:** `GET /api/admin/files?page={page}&search={search}&subject={subject}&category={category}`

**Features:**
- Pagination (20 files per page)
- Search by filename (debounced 500ms)
- Filter by subject dropdown
- Filter by category dropdown
- Actions: Delete, Download, View Owner
- Shows: ID, Filename, Subject, Category, Owner, Size, Created date

---

#### saveUser()

**Purpose:** Create or update user

**API:**
- Create: `POST /api/admin/users`
- Update: `PUT /api/admin/users/{id}`

**Form Fields:**
- Name (required)
- Email (required, unique)
- Password (required for create, optional for update)
- Is Admin (checkbox)

**Validation:**
- Email format check
- Password minimum length (if provided)
- Duplicate email check (server-side)

---

#### deleteUser()

**Purpose:** Delete user with confirmation

**API:** `DELETE /api/admin/users/{id}`

**Implementation:**
```javascript
async deleteUser(userId, userName) {
    if (!confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
        return;
    }

    try {
        await apiRequest(`/api/admin/users/${userId}`, { method: 'DELETE' });
        this.loadUsers(); // Reload list
        this.loadStats(); // Update stats
    } catch (error) {
        alert('Failed to delete user: ' + (error.message || 'Unknown error'));
    }
}
```

---

### Debounce Helper

```javascript
debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
```

**Usage:** Search inputs (500ms delay)

---

## 5. Subject Profile Modal

**File:** `resources/js/subject-profile-modal.js`

**Purpose:** View and edit subject profile information

**Dependencies:**
- subject-profile-renderer.js

---

### Key Functions

#### viewSubjectProfile()

**Purpose:** View subject profile in expandable panel

**Exposed:** `window.viewSubjectProfile`

**Parameters:**
- `subjectName` - Subject to view
- `event` - Click event (optional)

**Implementation:**
```javascript
window.viewSubjectProfile = async function(subjectName, event) {
    if (event && event.stopPropagation) {
        event.stopPropagation();
    }

    // Get the detail panel for this subject
    const panelId = 'detail-' + subjectName.replace(/[^a-zA-Z0-9]/g, '_');
    const detailPanel = document.getElementById(panelId);

    if (!detailPanel) {
        console.error('Detail panel not found for subject:', subjectName);
        return;
    }

    // Toggle panel visibility
    if (detailPanel.style.display === 'block') {
        detailPanel.style.display = 'none';
        return;
    }

    // Show loading state
    detailPanel.style.display = 'block';
    detailPanel.innerHTML = '<div class="loading">Loading profile...</div>';

    try {
        // Try to fetch existing profile - 404 is expected for subjects without profiles
        const response = await fetch(`/api/subject-profiles/${encodeURIComponent(subjectName)}`, {
            headers: { 'Accept': 'application/json' }
        }).then(res => res.ok ? res : null).catch(() => null);

        let profile = null;
        if (response) {
            const data = await response.json();
            profile = data.profile;
        }

        // Display profile info in the panel
        displaySubjectProfileInPanel(detailPanel, subjectName, profile);
    } catch (error) {
        detailPanel.innerHTML = '<p class="error">Failed to load profile</p>';
    }
}
```

**Behavior:**
- Click once: Expand panel and load profile
- Click again: Collapse panel
- Shows "Create Profile" button if no profile exists

---

#### saveSubjectProfile()

**Purpose:** Create or update subject profile

**Exposed:** `window.saveSubjectProfile`

**API:**
- Create: `POST /api/subject-profiles`
- Update: `PUT /api/subject-profiles/{subjectName}`

**Form Fields:**
- Subject name (readonly)
- Description (textarea)
- Professor name
- Course code
- Credits (number)
- Semester
- Year (number)
- Color (color picker)
- Notes (textarea)

**Implementation:**
```javascript
window.saveSubjectProfile = async function(event) {
    event.preventDefault();

    const subjectName = document.getElementById('profileSubjectName').value;
    const formData = {
        subject_name: subjectName,
        description: document.getElementById('profileDescription').value,
        professor_name: document.getElementById('profileProfessor').value,
        course_code: document.getElementById('profileCourseCode').value,
        credits: parseInt(document.getElementById('profileCredits').value) || null,
        semester: document.getElementById('profileSemester').value,
        year: parseInt(document.getElementById('profileYear').value) || null,
        color: document.getElementById('profileColor').value,
        notes: document.getElementById('profileNotes').value
    };

    try {
        // Check if profile exists
        const checkResponse = await fetch(`/api/subject-profiles/${encodeURIComponent(subjectName)}`, {
            headers: { 'Accept': 'application/json' }
        });

        const profileExists = checkResponse.ok;

        // Use PUT if exists, POST if new
        const method = profileExists ? 'PUT' : 'POST';
        const url = profileExists
            ? `/api/subject-profiles/${encodeURIComponent(subjectName)}`
            : '/api/subject-profiles';

        // Use global fetchAPI if available
        let response;
        if (typeof window.fetchAPI === 'function') {
            response = await window.fetchAPI(url, {
                method: method,
                body: JSON.stringify(formData)
            });
        } else {
            const token = localStorage.getItem('token');
            const rawResponse = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            response = await rawResponse.json();
        }

        // Close modal and refresh
        closeProfileModal();
        if (typeof loadDashboard === 'function') {
            loadDashboard();
        }
    } catch (error) {
        console.error('Error saving profile:', error);
        alert('Failed to save profile: ' + (error.message || 'Unknown error'));
    }
}
```

**Auto-Detection:**
- Checks if profile exists via GET request
- Uses PUT for update, POST for create
- Seamless UX (user doesn't need to know difference)

---

## 6. Common Patterns

### API Communication

**Centralized Helper:**
```javascript
async function fetchAPI(url, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers
    };

    const response = await fetch(url, {
        ...options,
        headers
    });

    if (!response.ok) {
        const error = await response.json();
        throw error;
    }

    return response.json();
}
```

**Usage:**
```javascript
// GET request
const data = await fetchAPI('/api/subjects');

// POST request
const result = await fetchAPI('/api/files', {
    method: 'POST',
    body: JSON.stringify({ subject_name: 'Math', ... })
});

// DELETE request
await fetchAPI(`/api/files/${id}`, { method: 'DELETE' });
```

---

### Token Storage

**Storing Token (after login):**
```javascript
localStorage.setItem('token', response.token);
```

**Retrieving Token:**
```javascript
const token = localStorage.getItem('token');
```

**Removing Token (logout):**
```javascript
localStorage.removeItem('token');
```

---

### Optimistic UI Updates

**Pattern:** Update UI immediately, revert on error

**Example:** Favorite Toggle
```javascript
// 1. Update UI immediately
starElement.textContent = '★';
favorites.push({ id: -1, subject_name: subjectName });
updateFavoriteCount();

// 2. Make API call
try {
    const response = await fetchAPI('/api/favorites', {...});
    // 3. Replace temp data with real data
    favorites = favorites.filter(f => f.subject_name !== subjectName);
    favorites.push(response.favorite);
} catch (error) {
    // 4. Revert on error
    starElement.textContent = '☆';
    favorites = favorites.filter(f => f.subject_name !== subjectName);
    updateFavoriteCount();
}
```

**Benefits:**
- Instant feedback
- Perceived performance
- Better UX

---

### XSS Protection

**All HTML sanitized:**
```javascript
import DOMPurify from 'dompurify';

function sanitizeHTML(html) {
    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['div', 'span', 'p', 'strong', 'button', 'a'],
        ALLOWED_ATTR: ['class', 'style', 'onclick', 'title', 'href']
    });
}

// Usage
element.innerHTML = sanitizeHTML(userContent);
```

---

## 7. Build and Deployment

### Vite Configuration

**File:** `vite.config.js`

```javascript
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/js/app.js', 'resources/css/app.css'],
            refresh: true,
        }),
    ],
});
```

---

### Build Commands

**Development:**
```bash
npm run dev
```
- Starts Vite dev server
- Hot module replacement (HMR)
- Source maps enabled

**Production:**
```bash
npm run build
```
- Minifies JavaScript
- Removes console.log
- Generates hashed filenames
- Outputs to `public/build/`

---

### Including in Blade

```blade
<!-- resources/views/layouts/app.blade.php -->
<!DOCTYPE html>
<html>
<head>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body>
    @yield('content')
</body>
</html>
```

**Output:**
```html
<!-- Development -->
<script type="module" src="http://localhost:5173/@vite/client"></script>
<script type="module" src="http://localhost:5173/resources/js/app.js"></script>

<!-- Production -->
<script type="module" src="/build/assets/app-abc123.js"></script>
<link rel="stylesheet" href="/build/assets/app-def456.css">
```

---

## 8. Performance Optimizations

### Code Splitting

**Lazy Loading:**
```javascript
// Not currently implemented, but recommended for large apps
const admin = () => import('./admin.js');
```

### Debouncing

**Search Inputs:**
```javascript
searchInput.addEventListener('input', debounce((e) => {
    performSearch(e.target.value);
}, 500));
```

**Benefits:**
- Reduces API calls
- Better performance
- Smoother UX

### Caching

**Subject Files Cache:**
```javascript
let subjectFiles = {}; // In-memory cache

async function loadSubjectFiles(subjectName) {
    if (subjectFiles[subjectName]) {
        return subjectFiles[subjectName]; // Return cached
    }

    const files = await fetchAPI(`/api/files?subject=${subjectName}`);
    subjectFiles[subjectName] = files; // Cache result
    return files;
}
```

---

## 9. Error Handling

### Global Error Handler

```javascript
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);

    // Redirect to login if 401
    if (event.reason?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
    }
});
```

### Try-Catch Pattern

```javascript
async function loadData() {
    try {
        const data = await fetchAPI('/api/endpoint');
        displayData(data);
    } catch (error) {
        console.error('Failed to load data:', error);
        showError('Failed to load data. Please try again.');
    }
}
```

---

## 10. Testing

### Manual Testing Checklist

**Dashboard:**
- [ ] File tree loads
- [ ] Subjects can be expanded/collapsed
- [ ] Favorites can be toggled
- [ ] Search works
- [ ] File download works
- [ ] File upload works
- [ ] Subject profiles load

**Admin Panel:**
- [ ] User list loads with pagination
- [ ] User search works
- [ ] User creation works
- [ ] User edit works
- [ ] User delete works with confirmation
- [ ] File list loads with filters
- [ ] File delete works
- [ ] Stats display correctly

**File Upload:**
- [ ] Modal opens (contextual mode)
- [ ] Modal opens (global mode)
- [ ] File validation works
- [ ] Upload progress shows
- [ ] Processing status polls correctly
- [ ] Success closes modal and reloads
- [ ] Error displays correctly

---

### E2E Testing (Playwright)

**Test Files:** `tests/tests/gui/*.spec.ts`

**Example:**
```typescript
import { test, expect } from '@playwright/test';
import { setupAuth } from '../helpers/auth.helper';

test.describe('Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        await setupAuth(page);
    });

    test('should load file tree', async ({ page }) => {
        await page.goto('/dashboard');
        await expect(page.locator('.file-tree')).toBeVisible();
    });

    test('should toggle favorite', async ({ page }) => {
        await page.goto('/dashboard');
        const star = page.locator('.favorite-star').first();
        await star.click();
        await expect(star).toHaveClass(/active/);
    });
});
```

---

## 11. Troubleshooting

### Issue: Token Not Found

**Symptoms:** Redirected to login on every page load

**Check:**
```javascript
console.log(localStorage.getItem('token'));
```

**Solution:**
- Clear localStorage
- Re-login
- Check for typos in token key

---

### Issue: CORS Errors

**Symptoms:** API requests blocked in console

**Solution:**
- Ensure API routes are on same domain
- Check Sanctum stateful domains configuration
- Verify `Accept: application/json` header

---

### Issue: Vite Dev Server Not Found

**Symptoms:** `ERR_CONNECTION_REFUSED` on `localhost:5173`

**Solution:**
```bash
# Start Vite dev server
npm run dev
```

---

### Issue: Changes Not Reflecting

**Symptoms:** JavaScript changes don't appear

**Solution:**
```bash
# Clear browser cache (Ctrl+Shift+R)
# Or rebuild
npm run build

# Restart Laravel Octane
docker-compose restart php
```

---

**Last Updated:** 2025-11-13
**Version:** 1.0
**Maintained By:** Development Team
