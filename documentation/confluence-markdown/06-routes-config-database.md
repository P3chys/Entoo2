# Routes, Configuration, and Database Schema

## Quick Reference

| Component Type | Count | Purpose |
|----------------|-------|---------|
| **Route Files** | 3 | API routes, web routes, console commands |
| **API Routes** | 30+ | RESTful API endpoints |
| **Web Routes** | 10+ | Frontend page routes |
| **Config Files** | 13 | Application configuration |
| **Database Tables** | 7 | Core data schema |
| **Migrations** | 14 | Database structure and changes |

### Routes Overview

| File | Routes | Purpose |
|------|--------|---------|
| `routes/api.php` | 30+ endpoints | RESTful API for frontend |
| `routes/web.php` | 10+ pages | Frontend page rendering |
| `routes/console.php` | 1 command | Custom CLI commands |

---

## 1. API Routes

**File:** `routes/api.php`

**Base URL:** `/api`

**Authentication:** Laravel Sanctum (token-based)

---

### Public Routes (No Authentication)

#### Authentication Endpoints

| Method | Endpoint | Controller | Rate Limit | Purpose |
|--------|----------|------------|------------|---------|
| POST | `/register` | `AuthController@register` | 3/minute | User registration |
| POST | `/login` | `AuthController@login` | 5/minute | User login |
| POST | `/forgot-password` | `AuthController@forgotPassword` | 3/10min | Request password reset |
| POST | `/reset-password` | `AuthController@resetPassword` | 5/10min | Reset password with token |

**Rate Limiting:**
```php
Route::post('/register', [AuthController::class, 'register'])
    ->middleware('conditional.throttle:3,1'); // 3 attempts per minute

Route::post('/login', [AuthController::class, 'login'])
    ->middleware('conditional.throttle:5,1'); // 5 attempts per minute

Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])
    ->middleware('conditional.throttle:3,10'); // 3 attempts per 10 minutes

Route::post('/reset-password', [AuthController::class, 'resetPassword'])
    ->middleware('conditional.throttle:5,10'); // 5 attempts per 10 minutes
```

**Why Conditional Throttle:**
- Uses `ConditionalThrottle` middleware that can be bypassed for E2E tests
- Bypass via `X-Bypass-Rate-Limit` header with correct token
- Automatically bypassed in testing environment

---

#### Health Check

| Method | Endpoint | Controller | Purpose |
|--------|----------|------------|---------|
| GET | `/health` | `HealthController@check` | Service health status |

**Response:**
```json
{
  "status": "healthy",
  "services": {
    "database": "connected",
    "redis": "connected",
    "elasticsearch": "connected"
  }
}
```

---

#### Browse and Search (Public)

| Method | Endpoint | Controller | Purpose |
|--------|----------|------------|---------|
| GET | `/subjects` | `SubjectController@index` | List all subjects |
| GET | `/subjects/categories` | `SubjectController@categories` | List all categories |
| GET | `/subjects/{subjectName}` | `SubjectController@show` | Get subject details |
| GET | `/files` | `FileController@index` | List files (with filters) |
| GET | `/files/browse` | `FileController@browse` | Browse files by subject/category |
| GET | `/search` | `SearchController@search` | Full-text search |

**Implementation:**
```php
// Public browsing routes (no auth required)
Route::get('/subjects', [SubjectController::class, 'index']);
Route::get('/subjects/categories', [SubjectController::class, 'categories']);
Route::get('/subjects/{subjectName}', [SubjectController::class, 'show']);
Route::get('/files', [FileController::class, 'index']);
Route::get('/files/browse', [FileController::class, 'browse']);
Route::get('/search', [SearchController::class, 'search']);
```

**Design Decision:** Browse and search are public to allow users to explore content before registering.

---

#### Subject Profiles (Public Read)

| Method | Endpoint | Controller | Purpose |
|--------|----------|------------|---------|
| GET | `/subject-profiles` | `SubjectProfileController@index` | List all subject profiles |
| GET | `/subject-profiles/{subjectName}` | `SubjectProfileController@show` | Get subject profile details |

```php
// Subject profiles (public read)
Route::get('/subject-profiles', [SubjectProfileController::class, 'index']);
Route::get('/subject-profiles/{subjectName}', [SubjectProfileController::class, 'show']);
```

---

### Protected Routes (Authentication Required)

**Middleware:** `auth:sanctum`

**Authorization:** Bearer token in `Authorization` header

---

#### User Management

| Method | Endpoint | Controller | Purpose |
|--------|----------|------------|---------|
| POST | `/logout` | `AuthController@logout` | Logout and delete token |
| GET | `/user` | `AuthController@user` | Get current user details |
| GET | `/profile` | `AuthController@profile` | Get user profile |
| POST | `/change-password` | `AuthController@changePassword` | Change password |

```php
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::get('/profile', [AuthController::class, 'profile']);
    Route::post('/change-password', [AuthController::class, 'changePassword']);
});
```

---

#### File Management

| Method | Endpoint | Controller | Authorization | Purpose |
|--------|----------|------------|---------------|---------|
| POST | `/files` | `FileController@store` | Any authenticated user | Upload file |
| GET | `/files/{id}` | `FileController@show` | File owner only | Get file details |
| GET | `/files/{id}/status` | `FileController@status` | Any authenticated user | Get processing status |
| GET | `/files/{id}/download` | `FileController@download` | Any authenticated user | Download file |
| DELETE | `/files/{id}` | `FileController@destroy` | File owner only (via policy) | Delete file |

```php
// File management (upload, delete)
Route::post('/files', [FileController::class, 'store']);
Route::get('/files/{id}', [FileController::class, 'show']);
Route::get('/files/{id}/status', [FileController::class, 'status']);
Route::get('/files/{id}/download', [FileController::class, 'download']);
Route::delete('/files/{id}', [FileController::class, 'destroy']);
```

**Authorization:**
- Upload: Any authenticated user
- Download: Any authenticated user (document sharing platform)
- View details: Owner only (via `FilePolicy@view`)
- Delete: Owner only (via `FilePolicy@delete`)

---

#### Favorites

| Method | Endpoint | Controller | Purpose |
|--------|----------|------------|---------|
| GET | `/favorites` | `FavoriteController@index` | Get user's favorites |
| POST | `/favorites` | `FavoriteController@store` | Add subject to favorites |
| DELETE | `/favorites/{id}` | `FavoriteController@destroy` | Remove from favorites |

```php
// Favorites
Route::get('/favorites', [FavoriteController::class, 'index']);
Route::post('/favorites', [FavoriteController::class, 'store']);
Route::delete('/favorites/{id}', [FavoriteController::class, 'destroy']);
```

---

#### Statistics

| Method | Endpoint | Controller | Purpose |
|--------|----------|------------|---------|
| GET | `/stats` | `HealthController@stats` | Get system statistics |

```php
// Stats
Route::get('/stats', [HealthController::class, 'stats']);
```

**Response:**
```json
{
  "total_files": 1250,
  "total_subjects": 45,
  "total_users": 150,
  "total_storage": "2.5 GB",
  "files_by_category": {...},
  "top_subjects": [...]
}
```

---

#### Subject Profiles (Write Operations)

| Method | Endpoint | Controller | Purpose |
|--------|----------|------------|---------|
| POST | `/subject-profiles` | `SubjectProfileController@store` | Create subject profile |
| PUT | `/subject-profiles/{subjectName}` | `SubjectProfileController@update` | Update subject profile |
| DELETE | `/subject-profiles/{subjectName}` | `SubjectProfileController@destroy` | Delete subject profile |

```php
// Subject profiles (authenticated create/update/delete)
Route::post('/subject-profiles', [SubjectProfileController::class, 'store']);
Route::put('/subject-profiles/{subjectName}', [SubjectProfileController::class, 'update']);
Route::delete('/subject-profiles/{subjectName}', [SubjectProfileController::class, 'destroy']);
```

---

### Admin Routes

**Middleware:** `['auth:sanctum', 'admin']`

**Authorization:** User must be authenticated AND have `is_admin = true`

**URL Prefix:** `/api/admin`

---

#### Admin Endpoints

| Method | Endpoint | Controller | Purpose |
|--------|----------|------------|---------|
| GET | `/admin/stats` | `AdminController@getStats` | Admin dashboard statistics |
| GET | `/admin/users` | `AdminController@getUsers` | List all users (paginated) |
| POST | `/admin/users` | `AdminController@createUser` | Create new user |
| PUT | `/admin/users/{user}` | `AdminController@updateUser` | Update user details |
| DELETE | `/admin/users/{user}` | `AdminController@deleteUser` | Delete user |
| GET | `/admin/files` | `AdminController@getFiles` | List all files (paginated) |
| DELETE | `/admin/files/{file}` | `AdminController@deleteFile` | Delete any file (bypass policy) |

```php
// Admin routes (require authentication + admin role)
Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
    // Dashboard stats
    Route::get('/stats', [AdminController::class, 'getStats']);

    // User management
    Route::get('/users', [AdminController::class, 'getUsers']);
    Route::post('/users', [AdminController::class, 'createUser']);
    Route::put('/users/{user}', [AdminController::class, 'updateUser']);
    Route::delete('/users/{user}', [AdminController::class, 'deleteUser']);

    // File management
    Route::get('/files', [AdminController::class, 'getFiles']);
    Route::delete('/files/{file}', [AdminController::class, 'deleteFile']);
});
```

**Security:**
- `auth:sanctum` ensures user is authenticated
- `admin` middleware checks `$user->is_admin === true`
- Returns 403 Forbidden if non-admin tries to access

---

## 2. Web Routes

**File:** `routes/web.php`

**Purpose:** Render frontend Blade views for SPA-like experience

**Authentication:** Handled client-side via API tokens

---

### Web Route List

| Method | Path | View | Name | Purpose |
|--------|------|------|------|---------|
| GET | `/` | redirect to /login | - | Redirect root to login |
| GET | `/login` | `auth.login` | `login` | Login page |
| GET | `/register` | `auth.register` | `register` | Registration page |
| GET | `/forgot-password` | `auth.forgot-password` | `password.request` | Forgot password form |
| GET | `/reset-password/{token}` | `auth.reset-password` | `password.reset` | Reset password form |
| GET | `/dashboard` | `dashboard-enhanced` | `dashboard` | Main dashboard |
| GET | `/dashboard/subject/{subject}` | `dashboard-enhanced` | `dashboard.subject` | Dashboard filtered by subject |
| GET | `/dashboard/search` | `dashboard-enhanced` | `dashboard.search` | Dashboard with search |
| GET | `/dashboard/profile/{subject}` | `dashboard-enhanced` | `dashboard.profile` | Subject profile view |
| GET | `/dashboard/user/{userId}` | `dashboard-enhanced` | `dashboard.user` | Files by specific user |
| GET | `/favorites` | `favorites` | `favorites` | Favorites page |
| GET | `/admin` | `admin.dashboard` | `admin.dashboard` | Admin panel |

---

### Authentication Pages

```php
// Redirect root to login
Route::get('/', function () {
    return redirect('/login');
});

// Authentication pages
Route::get('/login', function () {
    return view('auth.login');
})->name('login');

Route::get('/register', function () {
    return view('auth.register');
})->name('register');
```

**Features:**
- No server-side session authentication
- Frontend uses API tokens stored in localStorage
- Login/register pages call `/api/login` and `/api/register`

---

### Password Reset Pages

```php
// Password reset pages
Route::get('/forgot-password', function () {
    return view('auth.forgot-password');
})->name('password.request');

Route::get('/reset-password/{token}', function ($token) {
    return view('auth.reset-password', ['token' => $token]);
})->name('password.reset');
```

**Flow:**
1. User enters email on `/forgot-password`
2. Frontend calls `POST /api/forgot-password`
3. Email sent with reset link: `/reset-password/{token}`
4. User clicks link, opens reset page
5. Frontend calls `POST /api/reset-password` with token

---

### Dashboard Routes

```php
// Dashboard and app pages
Route::get('/dashboard', function () {
    return view('dashboard-enhanced');
})->name('dashboard');

// Dashboard sub-routes with proper navigation
Route::get('/dashboard/subject/{subject}', function ($subject) {
    return view('dashboard-enhanced', ['selectedSubject' => urldecode($subject)]);
})->name('dashboard.subject');

Route::get('/dashboard/search', function () {
    $query = request('q', '');
    return view('dashboard-enhanced', ['searchQuery' => $query]);
})->name('dashboard.search');

Route::get('/dashboard/profile/{subject}', function ($subject) {
    return view('dashboard-enhanced', ['profileSubject' => urldecode($subject)]);
})->name('dashboard.profile');

Route::get('/dashboard/user/{userId}/{userName?}', function ($userId, $userName = null) {
    return view('dashboard-enhanced', ['filterUserId' => $userId, 'filterUserName' => $userName]);
})->name('dashboard.user');
```

**Design Pattern:**
- Single Blade view (`dashboard-enhanced.blade.php`)
- Route parameters passed as view variables
- JavaScript reads variables and filters content accordingly
- SPA-like experience with server-side routing

---

### Admin Dashboard

```php
// Admin dashboard
// Security: admin.js checks user.is_admin on page load and redirects non-admins
// All admin API endpoints are protected with auth:sanctum + admin middleware
Route::get('/admin', function () {
    return view('admin.dashboard');
})->name('admin.dashboard');
```

**Security Model:**
- Web route is public (no middleware)
- JavaScript (`admin.js`) checks `user.is_admin` on page load
- Redirects non-admins to dashboard
- All API operations protected by `auth:sanctum` + `admin` middleware
- Defense in depth: Both client and server-side checks

---

## 3. Console Routes

**File:** `routes/console.php`

**Purpose:** Register custom Artisan commands (closure-based)

---

### Console Commands

```php
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');
```

**Usage:**
```bash
php artisan inspire
```

**Output:**
```
"The only way to do great work is to love what you do." - Steve Jobs
```

**Custom Commands:**
Most commands are class-based in `app/Console/Commands/` (see `01-console-commands.md`), but closure-based commands can be added here for simple operations.

---

## 4. Configuration Files

### services.php

**File:** `config/services.php`

**Purpose:** Third-party service credentials and Elasticsearch configuration

---

**Elasticsearch Configuration:**
```php
'elasticsearch' => [
    'host' => env('ELASTICSEARCH_HOST', 'http://elasticsearch:9200'),
    'index' => env('ELASTICSEARCH_INDEX', 'entoo_documents'),
],
```

**Environment Variables:**
```bash
# .env
ELASTICSEARCH_HOST=http://elasticsearch:9200
ELASTICSEARCH_INDEX=entoo_documents
```

**Usage:**
```php
$host = config('services.elasticsearch.host');
$index = config('services.elasticsearch.index');

$es = new ElasticsearchService($host, $index);
```

---

**Other Services (Available but Not Used):**
```php
'postmark' => [
    'token' => env('POSTMARK_TOKEN'),
],

'resend' => [
    'key' => env('RESEND_KEY'),
],

'ses' => [
    'key' => env('AWS_ACCESS_KEY_ID'),
    'secret' => env('AWS_SECRET_ACCESS_KEY'),
    'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
],

'slack' => [
    'notifications' => [
        'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
        'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
    ],
],
```

---

### sanctum.php

**File:** `config/sanctum.php`

**Purpose:** Laravel Sanctum API token authentication configuration

---

**Stateful Domains:**
```php
'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', sprintf(
    '%s%s',
    'localhost,localhost:3000,127.0.0.1,127.0.0.1:8000,::1',
    Sanctum::currentApplicationUrlWithPort(),
))),
```

**Purpose:** Domains that receive stateful (cookie-based) authentication

---

**Guards:**
```php
'guard' => ['web'],
```

**Purpose:** Authentication guards to check for stateful requests

---

**Token Expiration:**
```php
'expiration' => null,
```

**Purpose:** Token expiration time (null = no expiration)

**Setting Custom Expiration:**
```php
// .env
SANCTUM_EXPIRATION=1440  // 24 hours in minutes
```

---

**Token Prefix:**
```php
'token_prefix' => env('SANCTUM_TOKEN_PREFIX', ''),
```

**Purpose:** Prefix for security scanning (GitHub secret scanning)

---

**Middleware:**
```php
'middleware' => [
    'authenticate_session' => Laravel\Sanctum\Http\Middleware\AuthenticateSession::class,
    'encrypt_cookies' => Illuminate\Cookie\Middleware\EncryptCookies::class,
    'validate_csrf_token' => Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class,
],
```

---

### octane.php

**File:** `config/octane.php`

**Purpose:** Laravel Octane (Swoole) configuration for high performance

---

**Server Selection:**
```php
'server' => env('OCTANE_SERVER', 'roadrunner'),
```

**Options:** `roadrunner`, `swoole`, `frankenphp`

**Current:** Swoole (specified in Docker)

---

**HTTPS Enforcement:**
```php
'https' => env('OCTANE_HTTPS', false),
```

---

**Event Listeners:**
```php
'listeners' => [
    WorkerStarting::class => [
        EnsureUploadedFilesAreValid::class,
        EnsureUploadedFilesCanBeMoved::class,
    ],

    RequestReceived::class => [
        ...Octane::prepareApplicationForNextOperation(),
        ...Octane::prepareApplicationForNextRequest(),
    ],

    RequestTerminated::class => [
        // FlushUploadedFiles::class, // Commented out
    ],
],
```

**Key Features:**
- Application state persists between requests
- Listeners reset state for each request
- Faster than traditional PHP-FPM

**Important:** Must restart Octane after code changes:
```bash
docker-compose restart php
```

---

## 5. Database Schema

### Core Tables

| Table | Primary Purpose | Key Relationships |
|-------|----------------|-------------------|
| `users` | User accounts and authentication | Has many uploaded_files, favorite_subjects |
| `uploaded_files` | File metadata and storage | Belongs to user |
| `favorite_subjects` | User's favorited subjects | Belongs to user |
| `subject_profiles` | Rich subject information | Created/updated by users |
| `personal_access_tokens` | Sanctum API tokens | Belongs to user |
| `cache` | Redis cache fallback | N/A |
| `jobs` | Queue jobs | N/A |

---

### users Table

**Migration:** `0001_01_01_000000_create_users_table.php`

**Schema:**
```sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified_at TIMESTAMP NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    password VARCHAR(255) NOT NULL,
    remember_token VARCHAR(100) NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
);
```

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE on `email`

**Added Columns:**
- `is_admin` (migration: `2025_11_10_093102_add_is_admin_to_users_table.php`)

---

### uploaded_files Table

**Migration:** `2025_10_25_151944_create_uploaded_files_table.php`

**Schema:**
```sql
CREATE TABLE uploaded_files (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    filepath VARCHAR(500) NOT NULL,
    subject_name VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    file_size BIGINT UNSIGNED NOT NULL,
    file_extension VARCHAR(10) NOT NULL,
    processing_status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    processing_error TEXT NULL,
    processed_at TIMESTAMP NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
);
```

**Indexes:**
```sql
-- Composite index (initial)
INDEX idx_user_subject_category (user_id, subject_name, category)

-- Performance indexes (added later)
INDEX idx_subject_name (subject_name)
INDEX idx_category (category)
INDEX idx_created_at (created_at)

-- Composite indexes for common queries
INDEX idx_subject_category (subject_name, category)
INDEX idx_subject_created (subject_name, created_at DESC)
```

**Processing Status:**
Added by migration `2025_10_30_004438_add_processing_status_to_uploaded_files_table.php`

**Values:**
- `pending` - File uploaded, queued for processing
- `processing` - ProcessUploadedFile job running
- `completed` - Successfully processed and indexed
- `failed` - Processing failed after retries

---

### favorite_subjects Table

**Migration:** `2025_10_25_151934_create_favorite_subjects_table.php`

**Schema:**
```sql
CREATE TABLE favorite_subjects (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_name VARCHAR(200) NOT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,

    UNIQUE(user_id, subject_name)
);
```

**Indexes:**
```sql
-- Performance indexes
INDEX idx_user_id (user_id)
INDEX idx_subject_name (subject_name)

-- Unique constraint
UNIQUE(user_id, subject_name)
```

---

### subject_profiles Table

**Migration:** `2025_10_25_223735_create_subject_profiles_table.php`

**Schema:**
```sql
CREATE TABLE subject_profiles (
    id BIGSERIAL PRIMARY KEY,
    subject_name VARCHAR(200) UNIQUE NOT NULL,
    description TEXT NULL,
    professors TEXT NULL,
    exam_info TEXT NULL,
    semester VARCHAR(50) NULL,
    credits INTEGER NULL,
    created_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    updated_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
);
```

**Indexes:**
- UNIQUE on `subject_name`
- FOREIGN KEY on `created_by` (references users)
- FOREIGN KEY on `updated_by` (references users)

---

### personal_access_tokens Table

**Migration:** `2025_10_25_153008_create_personal_access_tokens_table.php`

**Purpose:** Laravel Sanctum token storage

**Schema:**
```sql
CREATE TABLE personal_access_tokens (
    id BIGSERIAL PRIMARY KEY,
    tokenable_type VARCHAR(255) NOT NULL,
    tokenable_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    token VARCHAR(64) UNIQUE NOT NULL,
    abilities TEXT NULL,
    last_used_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
);
```

**Indexes:**
```sql
INDEX idx_tokenable (tokenable_type, tokenable_id)
UNIQUE(token)
```

---

## 6. Common Workflows

### User Registration and Login Flow

```
User visits /register
  ↓
Fill form, submit
  ↓
Frontend: POST /api/register
  ↓
AuthController@register
  ↓
Create user in database
  ↓
Generate Sanctum token
  ↓
Return user + token
  ↓
Frontend stores token in localStorage
  ↓
Redirect to /dashboard
  ↓
Dashboard loads with token in headers
```

---

### File Upload and Processing Flow

```
User uploads file on /dashboard
  ↓
Frontend: POST /api/files (with file + metadata)
  ↓
FileController@store (auth:sanctum)
  ↓
Validate request
  ↓
Store file in storage/app/uploads/{subject}/{category}/
  ↓
Create uploaded_files record (status: 'pending')
  ↓
Dispatch ProcessUploadedFile job
  ↓
Return 201 response with file data
  ↓
[Background] ProcessUploadedFile job
  ↓
Extract text content (DocumentParserService)
  ↓
Index in Elasticsearch (ElasticsearchService)
  ↓
Update status to 'completed'
  ↓
Clear related caches
```

---

### Admin User Management Flow

```
Admin visits /admin
  ↓
admin.js checks user.is_admin
  ↓
If not admin → redirect to /dashboard
If admin → continue
  ↓
Frontend: GET /api/admin/users (with auth token)
  ↓
auth:sanctum middleware validates token
  ↓
admin middleware checks is_admin
  ↓
AdminController@getUsers
  ↓
Return paginated user list
  ↓
Display in admin panel
```

---

## 7. Security Features

### Rate Limiting

**Implementation:** `ConditionalThrottle` middleware

**Limits:**
- Register: 3 attempts per minute
- Login: 5 attempts per minute
- Forgot Password: 3 attempts per 10 minutes
- Reset Password: 5 attempts per 10 minutes

**Bypass Mechanisms:**
1. `X-Bypass-Rate-Limit` header with correct token (E2E tests)
2. Testing environment (`APP_ENV=testing`)
3. Test user emails in local environment

---

### Authentication

**Method:** Laravel Sanctum (token-based)

**Token Storage:**
- Frontend: `localStorage` (key: `auth_token`)
- Backend: `personal_access_tokens` table (hashed)

**Token Caching:**
- Middleware: `CacheSanctumToken`
- Cache TTL: 30 minutes
- Cache key: `sanctum:token:{sha256}`

**Security Benefits:**
- No database query on every request (Redis cache)
- Token expiration supported
- Automatic revocation on logout

---

### Authorization

**Method:** Policies and Middleware

**FilePolicy:**
- Download: Any authenticated user
- View: Owner only
- Update: Owner only
- Delete: Owner only

**Admin Middleware:**
- Checks `$user->is_admin === true`
- Returns 403 if not admin
- Applied to all `/api/admin/*` routes

---

### CSRF Protection

**Web Routes:** CSRF protection enabled via `VerifyCsrfToken` middleware

**API Routes:** CSRF not required (token-based auth)

**Sanctum:** Handles CSRF for stateful requests

---

## 8. Performance Optimizations

### Route Caching

**Production:**
```bash
php artisan route:cache
```

**Effect:** Compiles routes into single cached file (faster routing)

**When to Clear:**
- After adding/modifying routes
- After deployment

```bash
php artisan route:clear
```

---

### Database Indexes

**uploaded_files:**
- `idx_user_id` - Filter by user
- `idx_subject_name` - Filter by subject
- `idx_category` - Filter by category
- `idx_subject_category` - Common combined filter
- `idx_subject_created` - Paginated subject listings
- `idx_created_at` - Recent files

**Benefits:**
- 10-100x faster queries on large datasets
- Efficient pagination
- Fast filtering and sorting

---

### Elasticsearch Optimization

**When to Use Elasticsearch:**
- Full-text search queries
- Single `subject_name` filter (fast path in FileController)
- Large result sets (1000+ files)

**When to Use PostgreSQL:**
- Complex filters (multiple conditions)
- Paginated results (50 per page)
- Exact matching

**Caching:**
- Elasticsearch results cached for 5 minutes
- Cache key includes query parameters

---

## 9. Testing

### Route Testing

```php
use Illuminate\Foundation\Testing\RefreshDatabase;

public function test_public_routes_accessible()
{
    $response = $this->get('/api/subjects');
    $response->assertOk();

    $response = $this->get('/api/search?q=test');
    $response->assertOk();
}

public function test_protected_routes_require_auth()
{
    $response = $this->get('/api/user');
    $response->assertStatus(401);

    $user = User::factory()->create();
    $response = $this->actingAs($user)->get('/api/user');
    $response->assertOk();
}

public function test_admin_routes_require_admin_role()
{
    $user = User::factory()->create(['is_admin' => false]);

    $response = $this->actingAs($user)->get('/api/admin/users');
    $response->assertStatus(403);

    $admin = User::factory()->create(['is_admin' => true]);
    $response = $this->actingAs($admin)->get('/api/admin/users');
    $response->assertOk();
}
```

---

### Configuration Testing

```php
public function test_elasticsearch_configuration()
{
    $host = config('services.elasticsearch.host');
    $index = config('services.elasticsearch.index');

    $this->assertNotEmpty($host);
    $this->assertNotEmpty($index);
    $this->assertEquals('entoo_documents', $index);
}

public function test_sanctum_expiration_null()
{
    $expiration = config('sanctum.expiration');
    $this->assertNull($expiration);
}
```

---

## 10. Troubleshooting

### Issue: Routes Not Found (404)

**Symptoms:** API or web routes return 404

**Check:**
```bash
php artisan route:list
php artisan route:list | grep "api/files"
```

**Solution:**
```bash
# Clear route cache
php artisan route:clear

# Rebuild cache (production only)
php artisan route:cache

# Restart Octane
docker-compose restart php
```

---

### Issue: Rate Limiting Too Aggressive

**Symptoms:** E2E tests failing due to rate limits

**Solution:**
```bash
# Use bypass header
X-Bypass-Rate-Limit: test-bypass-token-2024

# Or set environment
APP_ENV=testing
```

---

### Issue: Sanctum Token Not Working

**Symptoms:** `401 Unauthorized` on protected routes

**Check:**
```bash
# Verify token exists
SELECT * FROM personal_access_tokens WHERE tokenable_id = 1;

# Check token format in request
Authorization: Bearer {token}
```

**Solution:**
- Ensure token is not expired
- Clear token cache: `php artisan cache:clear`
- Regenerate token: `/api/login` again

---

### Issue: Admin Routes Return 403

**Symptoms:** Admin user gets 403 on `/api/admin/*`

**Check:**
```sql
SELECT id, email, is_admin FROM users WHERE id = 1;
```

**Solution:**
```sql
-- Set user as admin
UPDATE users SET is_admin = TRUE WHERE id = 1;
```

```bash
# Clear config cache
php artisan config:clear
```

---

## 11. Environment Variables

### Required Variables

```bash
# Database
DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=entoo
DB_USERNAME=postgres
DB_PASSWORD=secret

# Redis
REDIS_HOST=redis
REDIS_PASSWORD=null
REDIS_PORT=6379
CACHE_DRIVER=redis

# Elasticsearch
ELASTICSEARCH_HOST=http://elasticsearch:9200
ELASTICSEARCH_INDEX=entoo_documents

# Queue
QUEUE_CONNECTION=redis

# Sanctum
SANCTUM_STATEFUL_DOMAINS=localhost,127.0.0.1

# Rate Limiting
APP_RATE_LIMIT_BYPASS_TOKEN=test-bypass-token-2024

# Octane
OCTANE_SERVER=swoole
```

---

**Last Updated:** 2025-11-13
**Version:** 1.0
**Maintained By:** Development Team
