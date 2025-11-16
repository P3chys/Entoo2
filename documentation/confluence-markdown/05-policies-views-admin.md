# Policies, View Components, and Admin Controllers

## Quick Reference

| Component Type | Count | Purpose |
|----------------|-------|---------|
| **Policies** | 1 | Authorization logic for UploadedFile operations |
| **View Components** | 3 | Reusable Blade UI components |
| **Web Controllers** | 1 | Web-based admin panel (non-API) |
| **Base Controller** | 1 | Abstract base with Laravel traits |

### Components Overview

| Component | Location | Key Responsibility |
|-----------|----------|-------------------|
| `FilePolicy` | Policies | Authorize file downloads, updates, and deletions |
| `search` | View Components | Search interface component |
| `fileTree` | View Components | File tree display component |
| `fileUpload` | View Components | File upload interface component |
| `AdminController` (Web) | Controllers/Admin | Web-based admin dashboard |
| `Controller` | Controllers | Base controller with authorization and validation |

---

## 1. Authorization Policies

### Overview

Authorization policies provide a clean, organized way to handle authorization logic for specific models. Policies are automatically discovered by Laravel and registered in `AuthServiceProvider`.

---

### FilePolicy

**File:** `app/Policies/FilePolicy.php`

**Purpose:** Define authorization rules for `UploadedFile` model operations

**Registered In:** `AuthServiceProvider::$policies`

**Model:** `App\Models\UploadedFile`

---

#### Class Structure

```php
namespace App\Policies;

use App\Models\UploadedFile;
use App\Models\User;

class FilePolicy
{
    /**
     * Determine if the user can download the file.
     */
    public function download(?User $user, UploadedFile $file): bool
    {
        // All authenticated users can download any file
        // This is appropriate for a document sharing platform
        return $user !== null;
    }

    /**
     * Determine if the user can view the file details.
     */
    public function view(?User $user, UploadedFile $file): bool
    {
        // File details are visible only to the owner
        return $user !== null && $user->id === $file->user_id;
    }

    /**
     * Determine if the user can update the file.
     */
    public function update(User $user, UploadedFile $file): bool
    {
        // Only the owner can update
        return $user->id === $file->user_id;
    }

    /**
     * Determine if the user can delete the file.
     */
    public function delete(User $user, UploadedFile $file): bool
    {
        // Only the owner can delete
        return $user->id === $file->user_id;
    }
}
```

---

#### Authorization Methods

| Method | User Requirement | Owner Required? | Description |
|--------|-----------------|----------------|-------------|
| `download()` | Authenticated | ❌ No | Any logged-in user can download files |
| `view()` | Authenticated | ✅ Yes | Only file owner can view detailed info |
| `update()` | Authenticated | ✅ Yes | Only file owner can update metadata |
| `delete()` | Authenticated | ✅ Yes | Only file owner can delete the file |

---

#### Authorization Logic

**Permissive Downloading:**
```php
public function download(?User $user, UploadedFile $file): bool
{
    return $user !== null;
}
```

> **Design Decision:** All authenticated users can download any file because Entoo is a document sharing platform. Files are meant to be shared across the community.
>
> **Future Enhancement:** Could be restricted by subject enrollment, user groups, or explicit sharing permissions.

**Owner-Only Operations:**
```php
public function delete(User $user, UploadedFile $file): bool
{
    return $user->id === $file->user_id;
}
```

> Only the user who uploaded the file can delete it. Admins use separate admin endpoints that bypass policies or use `Gate::forUser($admin)->allows()`.

---

#### Usage in Controllers

**Manual Authorization:**
```php
// FileController@destroy
public function destroy(Request $request, int $id)
{
    $file = UploadedFile::findOrFail($id);

    // Throws AuthorizationException if not authorized
    $this->authorize('delete', $file);

    // If authorized, proceed
    Storage::delete($file->filepath);
    $file->delete();

    return response()->json(['message' => 'File deleted successfully']);
}
```

**Conditional Authorization:**
```php
// Check without throwing exception
if ($request->user()->can('update', $file)) {
    // Allow update
} else {
    // Deny
}
```

**Resource Controller Auto-Authorization:**
```php
// In controller constructor
public function __construct()
{
    $this->authorizeResource(UploadedFile::class, 'file');
}
```

This automatically applies policy methods:
- `index` → no authorization
- `show` → `view` policy
- `store` → `create` policy (not defined, defaults to true)
- `update` → `update` policy
- `destroy` → `delete` policy

---

#### Admin Override

**Bypassing Policies for Admins:**

Admins can bypass policies using the `IsAdmin` middleware and direct model access:

```php
// AdminController@deleteFile
Route::middleware(['auth:sanctum', IsAdmin::class])
    ->delete('/admin/files/{id}', function ($id) {
        $file = UploadedFile::findOrFail($id);

        // Admin middleware already checked, no policy needed
        $file->delete();

        return response()->json(['message' => 'File deleted by admin']);
    });
```

---

#### Policy Registration

**Automatic Discovery:**
Laravel auto-discovers policies following this naming convention:
- Model: `App\Models\UploadedFile`
- Policy: `App\Policies\UploadedFilePolicy` (expected name)

**Manual Registration (Used Here):**
```php
// AuthServiceProvider
protected $policies = [
    UploadedFile::class => FilePolicy::class,
];
```

Manual registration is required because the policy name is `FilePolicy`, not `UploadedFilePolicy`.

---

#### Testing Policies

**PHPUnit Test:**
```php
use App\Models\User;
use App\Models\UploadedFile;
use App\Policies\FilePolicy;

public function test_user_can_download_any_file()
{
    $user = User::factory()->create();
    $file = UploadedFile::factory()->create();

    $policy = new FilePolicy();

    $this->assertTrue($policy->download($user, $file));
}

public function test_user_cannot_delete_others_files()
{
    $owner = User::factory()->create();
    $otherUser = User::factory()->create();
    $file = UploadedFile::factory()->create(['user_id' => $owner->id]);

    $policy = new FilePolicy();

    $this->assertFalse($policy->delete($otherUser, $file));
}

public function test_user_can_delete_own_files()
{
    $user = User::factory()->create();
    $file = UploadedFile::factory()->create(['user_id' => $user->id]);

    $policy = new FilePolicy();

    $this->assertTrue($policy->delete($user, $file));
}
```

---

## 2. View Components

### Overview

View Components are reusable, class-based Blade components that encapsulate HTML and logic. They are used to create modular, testable UI elements.

**Location:** `app/View/Components/`
**Blade Views:** `resources/views/components/`

---

### search Component

**File:** `app/View/Components/search.php`

**Purpose:** Render the search interface component

**Blade View:** `resources/views/components/search.blade.php`

---

#### Implementation

```php
namespace App\View\Components;

use Closure;
use Illuminate\Contracts\View\View;
use Illuminate\View\Component;

class search extends Component
{
    /**
     * Create a new component instance.
     */
    public function __construct()
    {
        //
    }

    /**
     * Get the view / contents that represent the component.
     */
    public function render(): View|Closure|string
    {
        return view('components.search');
    }
}
```

---

#### Usage in Blade

```blade
<!-- Using the component in a Blade template -->
<x-search />

<!-- With attributes (if component accepts them) -->
<x-search placeholder="Search files..." />
```

**Component Registration:**
- Class name: `search` (lowercase) → `<x-search />`
- Namespace: `App\View\Components`
- Auto-discovered by Laravel

---

### fileTree Component

**File:** `app/View/Components/fileTree.php`

**Purpose:** Render a hierarchical file tree display

**Blade View:** `resources/views/components/file-tree.blade.php`

---

#### Implementation

```php
namespace App\View\Components;

use Closure;
use Illuminate\Contracts\View\View;
use Illuminate\View\Component;

class fileTree extends Component
{
    /**
     * Create a new component instance.
     */
    public function __construct()
    {
        //
    }

    /**
     * Get the view / contents that represent the component.
     */
    public function render(): View|Closure|string
    {
        return view('components.file-tree');
    }
}
```

---

#### Usage in Blade

```blade
<!-- Display file tree -->
<x-file-tree />

<!-- With data passed from controller -->
<x-file-tree :files="$files" :subjects="$subjects" />
```

**Kebab Case Conversion:**
- Class: `fileTree` (camelCase)
- Blade: `<x-file-tree />` (kebab-case)

---

### fileUpload Component

**File:** `app/View/Components/fileUpload.php`

**Purpose:** Render file upload interface with drag-and-drop support

**Blade View:** `resources/views/components/file-upload.blade.php`

---

#### Implementation

```php
namespace App\View\Components;

use Closure;
use Illuminate\Contracts\View\View;
use Illuminate\View\Component;

class fileUpload extends Component
{
    /**
     * Create a new component instance.
     */
    public function __construct()
    {

    }

    /**
     * Get the view / contents that represent the component.
     */
    public function render(): View|Closure|string
    {
        return view('components.file-upload');
    }
}
```

---

#### Usage in Blade

```blade
<!-- File upload interface -->
<x-file-upload />

<!-- With custom attributes -->
<x-file-upload
    accept=".pdf,.doc,.docx"
    max-size="10485760"
/>
```

---

### View Component Features

**All components support:**
- Passing data via constructor parameters
- Attribute binding (`{{ $attributes }}`)
- Slot content (`{{ $slot }}`)
- Named slots
- Component methods for computed properties

**Enhanced Example (with data passing):**
```php
// Component class
class fileUpload extends Component
{
    public function __construct(
        public string $accept = '.pdf,.doc,.docx',
        public int $maxSize = 10485760,
        public ?string $subject = null
    ) {}

    public function render(): View
    {
        return view('components.file-upload');
    }
}
```

```blade
<!-- Blade view: components/file-upload.blade.php -->
<div class="file-upload" data-max-size="{{ $maxSize }}">
    <input type="file" accept="{{ $accept }}" />
    @if($subject)
        <p>Uploading to: {{ $subject }}</p>
    @endif
    {{ $slot }}
</div>
```

```blade
<!-- Usage -->
<x-file-upload accept=".pdf" :max-size="5242880" subject="Mathematics">
    <p>Drag and drop files here</p>
</x-file-upload>
```

---

## 3. Base Controller

### Controller

**File:** `app/Http/Controllers/Controller.php`

**Purpose:** Abstract base controller providing common functionality via traits

**Type:** Abstract class

---

#### Implementation

```php
namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Routing\Controller as BaseController;

abstract class Controller extends BaseController
{
    use AuthorizesRequests, ValidatesRequests;
}
```

---

#### Traits Provided

| Trait | Namespace | Key Methods | Purpose |
|-------|-----------|-------------|---------|
| `AuthorizesRequests` | `Illuminate\Foundation\Auth\Access` | `authorize()`, `authorizeForUser()`, `authorizeResource()` | Policy-based authorization |
| `ValidatesRequests` | `Illuminate\Foundation\Validation` | `validate()`, `validateWithBag()` | Request validation |

---

#### Usage

**All controllers extend this base:**
```php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;

class FileController extends Controller
{
    // Inherits authorize() and validate() methods
}
```

**Authorization via `authorize()`:**
```php
public function destroy(int $id)
{
    $file = UploadedFile::findOrFail($id);

    // Provided by AuthorizesRequests trait
    $this->authorize('delete', $file);

    $file->delete();
}
```

**Validation via `validate()`:**
```php
public function store(Request $request)
{
    // Provided by ValidatesRequests trait
    $validated = $this->validate($request, [
        'file' => 'required|file|max:10240',
        'subject_name' => 'required|string',
        'category' => 'required|in:Materialy,Otazky,Prednasky,Seminare',
    ]);

    // Proceed with validated data
}
```

---

## 4. Web Admin Controller

### AdminController (Web)

**File:** `app/Http/Controllers/Admin/AdminController.php`

**Purpose:** Web-based admin panel for viewing statistics and health checks

**Namespace:** `App\Http\Controllers\Admin` (separate from API AdminController)

**Routes:** Web routes with session authentication

**Views:** Blade templates in `resources/views/admin/`

---

#### Class Structure

```php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UploadedFile;
use App\Models\FavoriteSubject;
use App\Services\ElasticsearchService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;

class AdminController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
    }

    public function index()
    {
        // Dashboard with stats and health checks
    }

    public function users()
    {
        // User list with pagination
    }

    public function files()
    {
        // File list with pagination
    }

    private function checkDatabase(): array
    {
        // Database health check
    }

    private function checkRedis(): array
    {
        // Redis health check
    }

    private function checkElasticsearch(): array
    {
        // Elasticsearch health check
    }

    private function formatBytes(int $bytes, int $precision = 2): string
    {
        // Format bytes to human-readable size
    }
}
```

---

### Methods Reference

#### index(): View

**Purpose:** Display admin dashboard with statistics and health status

**Route:** `GET /admin` (web route)

**Authentication:** Required via `auth` middleware

**Response:** Blade view `admin.index`

---

**Implementation:**
```php
public function index()
{
    $stats = Cache::remember('admin.dashboard_stats', 60, function () {
        return [
            'users' => User::count(),
            'files' => UploadedFile::count(),
            'subjects' => UploadedFile::distinct('subject_name')->count('subject_name'),
            'favorites' => FavoriteSubject::count(),
            'total_size' => $this->formatBytes(UploadedFile::sum('file_size')),
        ];
    });

    $health = Cache::remember('admin.health_status', 30, function () {
        return [
            'database' => $this->checkDatabase(),
            'redis' => $this->checkRedis(),
            'elasticsearch' => $this->checkElasticsearch(),
        ];
    });

    return view('admin.index', compact('stats', 'health'));
}
```

**Cached Data:**

| Cache Key | Data | TTL |
|-----------|------|-----|
| `admin.dashboard_stats` | User/file/subject counts, total size | 60 sec |
| `admin.health_status` | Database, Redis, Elasticsearch status | 30 sec |

**Statistics Displayed:**
- Total users
- Total files
- Distinct subjects
- Total favorites
- Total storage size (human-readable)

**Health Checks:**
- PostgreSQL connection status
- Redis connection status
- Elasticsearch connection and index status

---

#### users(): View

**Purpose:** Display paginated list of all users

**Route:** `GET /admin/users` (web route)

**Authentication:** Required via `auth` middleware

**Response:** Blade view `admin.users`

---

**Implementation:**
```php
public function users()
{
    $users = User::orderBy('created_at', 'desc')->paginate(50);
    return view('admin.users', compact('users'));
}
```

**Pagination:** 50 users per page

**Ordering:** Newest users first (by `created_at`)

---

#### files(): View

**Purpose:** Display paginated list of all uploaded files

**Route:** `GET /admin/files` (web route)

**Authentication:** Required via `auth` middleware

**Response:** Blade view `admin.files`

---

**Implementation:**
```php
public function files()
{
    $files = UploadedFile::with('user')
        ->orderBy('created_at', 'desc')
        ->paginate(50);
    return view('admin.files', compact('files'));
}
```

**Eager Loading:** Loads associated `user` relationship to prevent N+1 queries

**Pagination:** 50 files per page

**Ordering:** Newest files first (by `created_at`)

---

### Helper Methods

#### checkDatabase(): array

**Purpose:** Verify PostgreSQL database connection

**Returns:** `['status' => 'healthy'|'error', 'message' => string]`

---

**Implementation:**
```php
private function checkDatabase(): array
{
    try {
        DB::connection()->getPdo();
        return ['status' => 'healthy', 'message' => 'Connected'];
    } catch (\Exception $e) {
        return ['status' => 'error', 'message' => 'Connection failed'];
    }
}
```

**Test:** Attempts to get PDO connection object

---

#### checkRedis(): array

**Purpose:** Verify Redis connection

**Returns:** `['status' => 'healthy'|'error', 'message' => string]`

---

**Implementation:**
```php
private function checkRedis(): array
{
    try {
        Redis::ping();
        return ['status' => 'healthy', 'message' => 'Connected'];
    } catch (\Exception $e) {
        return ['status' => 'error', 'message' => 'Connection failed'];
    }
}
```

**Test:** Sends `PING` command to Redis

---

#### checkElasticsearch(): array

**Purpose:** Verify Elasticsearch connection and index status

**Returns:** `['status' => 'healthy'|'warning'|'error', 'message' => string]`

---

**Implementation:**
```php
private function checkElasticsearch(): array
{
    try {
        $es = app(ElasticsearchService::class);
        if ($es->ping()) {
            $indexExists = $es->indexExists();
            return [
                'status' => $indexExists ? 'healthy' : 'warning',
                'message' => $indexExists ? 'Connected & indexed' : 'Connected, no index'
            ];
        }
        return ['status' => 'error', 'message' => 'Ping failed'];
    } catch (\Exception $e) {
        return ['status' => 'error', 'message' => 'Connection failed'];
    }
}
```

**Status Levels:**
- `healthy` - Connected and index exists
- `warning` - Connected but index missing (needs `php artisan elasticsearch:init`)
- `error` - Connection failed

---

#### formatBytes(int $bytes, int $precision = 2): string

**Purpose:** Convert bytes to human-readable format

**Parameters:**
- `$bytes` - Number of bytes to format
- `$precision` - Decimal places (default: 2)

**Returns:** Formatted string (e.g., "1.50 GB")

---

**Implementation:**
```php
private function formatBytes(int $bytes, int $precision = 2): string
{
    $units = ['B', 'KB', 'MB', 'GB', 'TB'];
    $bytes = max($bytes, 0);
    $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
    $pow = min($pow, count($units) - 1);
    $bytes /= pow(1024, $pow);
    return round($bytes, $precision) . ' ' . $units[$pow];
}
```

**Examples:**
```php
formatBytes(1024);           // "1.00 KB"
formatBytes(1536);           // "1.50 KB"
formatBytes(1048576);        // "1.00 MB"
formatBytes(5368709120);     // "5.00 GB"
formatBytes(0);              // "0.00 B"
```

---

### Comparison: Web vs API AdminController

| Feature | Web AdminController | API AdminController |
|---------|---------------------|---------------------|
| **Namespace** | `App\Http\Controllers\Admin` | `App\Http\Controllers\Api` |
| **Authentication** | Session (`auth` middleware) | Sanctum tokens (`auth:sanctum`) |
| **Authorization** | Session-based login | `IsAdmin` middleware |
| **Response Type** | Blade views (HTML) | JSON |
| **Routes** | `routes/web.php` | `routes/api.php` |
| **Purpose** | Human-readable admin panel | Programmatic admin operations |
| **Users Endpoint** | `GET /admin/users` → view | `GET /api/admin/users` → JSON |
| **Files Endpoint** | `GET /admin/files` → view | `GET /api/admin/files` → JSON |

---

### Route Registration

**Web Routes (`routes/web.php`):**
```php
use App\Http\Controllers\Admin\AdminController;

Route::middleware(['auth'])->prefix('admin')->group(function () {
    Route::get('/', [AdminController::class, 'index'])->name('admin.dashboard');
    Route::get('/users', [AdminController::class, 'users'])->name('admin.users');
    Route::get('/files', [AdminController::class, 'files'])->name('admin.files');
});
```

**Access URLs:**
- Dashboard: `http://localhost:8000/admin`
- Users: `http://localhost:8000/admin/users`
- Files: `http://localhost:8000/admin/files`

---

### View Templates

**Required Blade Templates:**
- `resources/views/admin/index.blade.php` - Dashboard view
- `resources/views/admin/users.blade.php` - Users list view
- `resources/views/admin/files.blade.php` - Files list view

**Example Dashboard View:**
```blade
@extends('layouts.app')

@section('content')
<div class="admin-dashboard">
    <h1>Admin Dashboard</h1>

    <!-- Statistics -->
    <div class="stats-grid">
        <div class="stat-card">
            <h3>Users</h3>
            <p>{{ $stats['users'] }}</p>
        </div>
        <div class="stat-card">
            <h3>Files</h3>
            <p>{{ $stats['files'] }}</p>
        </div>
        <div class="stat-card">
            <h3>Subjects</h3>
            <p>{{ $stats['subjects'] }}</p>
        </div>
        <div class="stat-card">
            <h3>Storage</h3>
            <p>{{ $stats['total_size'] }}</p>
        </div>
    </div>

    <!-- Health Status -->
    <div class="health-checks">
        <h2>System Health</h2>
        <div class="health-item">
            <span>Database:</span>
            <span class="status-{{ $health['database']['status'] }}">
                {{ $health['database']['message'] }}
            </span>
        </div>
        <div class="health-item">
            <span>Redis:</span>
            <span class="status-{{ $health['redis']['status'] }}">
                {{ $health['redis']['message'] }}
            </span>
        </div>
        <div class="health-item">
            <span>Elasticsearch:</span>
            <span class="status-{{ $health['elasticsearch']['status'] }}">
                {{ $health['elasticsearch']['message'] }}
            </span>
        </div>
    </div>
</div>
@endsection
```

---

## Common Workflows

### 1. Authorization Check in Controller

```
User sends DELETE request to /api/files/123
  ↓
FileController@destroy
  ↓
Find UploadedFile model (ID: 123)
  ↓
Call: $this->authorize('delete', $file)
  ↓
Laravel resolves FilePolicy@delete
  ↓
Check: $user->id === $file->user_id
  ↓
If TRUE → proceed with deletion
If FALSE → throw AuthorizationException (403)
```

---

### 2. Admin Dashboard Load

```
Admin visits /admin
  ↓
AdminController@index (web)
  ↓
Check cache: admin.dashboard_stats (60s TTL)
  ↓
If cached → use cached stats
If not → query database and cache
  ↓
Check cache: admin.health_status (30s TTL)
  ↓
If cached → use cached health
If not → run health checks and cache
  ↓
Render admin.index Blade view
  ↓
Display stats + health status
```

---

### 3. File List with Pagination

```
Admin visits /admin/files
  ↓
AdminController@files (web)
  ↓
Query UploadedFile::with('user')
  ↓
Eager load user relationships (prevent N+1)
  ↓
Order by created_at DESC
  ↓
Paginate (50 per page)
  ↓
Render admin.files Blade view
  ↓
Display file list with pagination links
```

---

## Testing

### Policy Testing

```php
use App\Models\User;
use App\Models\UploadedFile;

public function test_file_owner_can_delete_file()
{
    $user = User::factory()->create();
    $file = UploadedFile::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user);

    $response = $this->deleteJson("/api/files/{$file->id}");

    $response->assertStatus(200);
    $this->assertDatabaseMissing('uploaded_files', ['id' => $file->id]);
}

public function test_non_owner_cannot_delete_file()
{
    $owner = User::factory()->create();
    $otherUser = User::factory()->create();
    $file = UploadedFile::factory()->create(['user_id' => $owner->id]);

    $this->actingAs($otherUser);

    $response = $this->deleteJson("/api/files/{$file->id}");

    $response->assertStatus(403);
    $this->assertDatabaseHas('uploaded_files', ['id' => $file->id]);
}
```

---

### View Component Testing

```php
use App\View\Components\fileUpload;
use Illuminate\View\Component;

public function test_file_upload_component_renders()
{
    $component = new fileUpload();

    $view = $component->render();

    $this->assertInstanceOf(\Illuminate\Contracts\View\View::class, $view);
    $this->assertEquals('components.file-upload', $view->name());
}

public function test_file_upload_component_in_view()
{
    $response = $this->get('/files/create');

    $response->assertSeeText('Upload File');
    $response->assertSee('file-upload'); // Component class name
}
```

---

### Admin Dashboard Testing

```php
use App\Models\User;
use App\Models\UploadedFile;

public function test_admin_dashboard_displays_stats()
{
    $admin = User::factory()->create(['is_admin' => true]);
    User::factory()->count(5)->create();
    UploadedFile::factory()->count(10)->create();

    $this->actingAs($admin);

    $response = $this->get('/admin');

    $response->assertOk();
    $response->assertSee('6'); // Total users (5 + admin)
    $response->assertSee('10'); // Total files
}

public function test_non_admin_cannot_access_dashboard()
{
    $user = User::factory()->create(['is_admin' => false]);

    $this->actingAs($user);

    $response = $this->get('/admin');

    $response->assertStatus(403); // Or redirect to login
}
```

---

## Configuration

### Policy Auto-Discovery

**Config:** `config/auth.php` (no explicit config needed)

**Auto-Discovery Rules:**
- Model: `App\Models\Post` → Policy: `App\Policies\PostPolicy`
- Model: `App\Models\Comment` → Policy: `App\Policies\CommentPolicy`

**Manual Registration (when needed):**
```php
// app/Providers/AuthServiceProvider.php
protected $policies = [
    UploadedFile::class => FilePolicy::class, // Non-standard name
];
```

---

### View Component Registration

**Auto-Discovery:** All classes in `app/View/Components/` are automatically discovered

**Blade Usage:** Convert class name to kebab-case:
- `search` → `<x-search />`
- `fileTree` → `<x-file-tree />`
- `fileUpload` → `<x-file-upload />`

---

### Cache Configuration

**Admin Dashboard Cache TTLs:**
```php
// config/cache.php or inline
'admin.dashboard_stats' => 60,  // 1 minute
'admin.health_status' => 30,    // 30 seconds
```

**Clearing Admin Caches:**
```bash
# Clear specific cache
php artisan cache:forget admin.dashboard_stats
php artisan cache:forget admin.health_status

# Or clear all
php artisan cache:clear
```

---

## Troubleshooting

### Issue: Policy Not Being Applied

**Symptoms:** Authorization always passes or always fails

**Check:**
```php
// Ensure policy is registered
dd(Gate::getPolicyFor(UploadedFile::class));

// Test policy directly
$policy = new FilePolicy();
dd($policy->delete($user, $file));
```

**Solution:**
- Verify `AuthServiceProvider::$policies` registration
- Clear config cache: `php artisan config:clear`
- Ensure controller extends base `Controller` (has `AuthorizesRequests` trait)

---

### Issue: View Component Not Found

**Symptoms:** "View component not found" error

**Check:**
```bash
# List all registered components
php artisan view:list
```

**Solution:**
- Ensure component class exists in `app/View/Components/`
- Check namespace is `App\View\Components`
- Verify Blade view exists in `resources/views/components/`
- Clear view cache: `php artisan view:clear`

---

### Issue: Admin Dashboard Shows Stale Data

**Symptoms:** Statistics don't update immediately

**Root Cause:** Aggressive caching (60 second TTL)

**Solution:**
```bash
# Clear admin caches
php artisan cache:forget admin.dashboard_stats
php artisan cache:forget admin.health_status

# Or reduce TTL in code
Cache::remember('admin.dashboard_stats', 10, function () {
    // Reduced to 10 seconds
});
```

---

### Issue: Health Check Always Shows "Error"

**Symptoms:** Dashboard shows all services as "error"

**Check:**
```bash
# Test services manually
docker-compose ps  # Check if all services running

# Test database
docker exec -it php php artisan tinker
>>> DB::connection()->getPdo();

# Test Redis
docker exec -it php php artisan tinker
>>> Redis::ping();

# Test Elasticsearch
curl http://localhost:9200/_cluster/health
```

**Solution:**
- Ensure all Docker services are running
- Check `.env` configuration
- Verify network connectivity between containers

---

**Last Updated:** 2025-11-13
**Version:** 1.0
**Maintained By:** Development Team
