# Middleware, Providers, and Jobs Reference

## Quick Reference

| Component Type | Count | Purpose |
|----------------|-------|---------|
| **Middleware** | 3 | Request/response filtering and optimization |
| **Providers** | 3 | Service registration and bootstrapping |
| **Jobs** | 1 | Asynchronous file processing |

### Components Overview

| Component | Location | Key Responsibility |
|-----------|----------|-------------------|
| `ConditionalThrottle` | Middleware | Rate limiting with test bypasses |
| `CacheSanctumToken` | Middleware | Token authentication caching (30 min) |
| `IsAdmin` | Middleware | Admin-only route protection |
| `AppServiceProvider` | Provider | Application bootstrapping |
| `AuthServiceProvider` | Provider | Authorization policy registration |
| `TelescopeServiceProvider` | Provider | Debugging tool configuration |
| `ProcessUploadedFile` | Job | File text extraction and indexing |

---

## 1. Middleware

### Overview

Middleware provides request/response filtering, authentication optimization, and access control. All middleware is registered in `bootstrap/app.php` and applied via route definitions.

---

### ConditionalThrottle

**File:** `app/Http/Middleware/ConditionalThrottle.php`

**Purpose:** Apply rate limiting conditionally, allowing bypasses for testing environments and E2E tests

**Dependencies:**
- `Illuminate\Routing\Middleware\ThrottleRequests`
- `Illuminate\Http\Request`
- `Closure`

**Configuration:**
- Rate limit bypass token: `config('app.rate_limit_bypass_token')`
- Default token: `'test-bypass-token-2024'`

---

#### Class Structure

```php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\ThrottleRequests;

class ConditionalThrottle extends ThrottleRequests
{
    public function handle($request, Closure $next, $maxAttempts = 60, $decayMinutes = 1, $prefix = '')
    {
        // Bypass rate limiting if conditions met
        if ($this->shouldBypassRateLimiting($request)) {
            return $next($request);
        }

        // Apply normal rate limiting
        return parent::handle($request, $next, $maxAttempts, $decayMinutes, $prefix);
    }

    protected function shouldBypassRateLimiting(Request $request): bool
    {
        // 1. Bypass with header token
        if ($request->hasHeader('X-Bypass-Rate-Limit')) {
            $bypassToken = $request->header('X-Bypass-Rate-Limit');
            $expectedToken = config('app.rate_limit_bypass_token', 'test-bypass-token-2024');

            if ($bypassToken === $expectedToken) {
                return true;
            }
        }

        // 2. Bypass in testing environment
        if (app()->environment('testing')) {
            return true;
        }

        // 3. Bypass for test users in local environment
        if (app()->environment('local')) {
            $email = $request->input('email', '');
            if (str_contains($email, 'test@') ||
                str_ends_with($email, '@test.entoo.cz')) {
                return true;
            }
        }

        return false;
    }
}
```

---

#### Bypass Strategies

| Strategy | Condition | Use Case |
|----------|-----------|----------|
| **Header Token** | `X-Bypass-Rate-Limit: {token}` | Playwright E2E tests, API testing |
| **Testing Environment** | `APP_ENV=testing` | PHPUnit tests |
| **Test User Email** | Local env + email contains `test@` or ends with `@test.entoo.cz` | Manual testing |

---

#### Usage in Routes

```php
// routes/api.php
Route::middleware([ConditionalThrottle::class . ':60,1'])->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/register', [AuthController::class, 'register']);
});
```

**Parameters:**
- `60` - Max attempts
- `1` - Decay minutes (time window)

---

#### E2E Test Example

```typescript
// Playwright test with bypass header
await page.request.post('http://localhost:8000/api/login', {
  headers: {
    'X-Bypass-Rate-Limit': 'test-bypass-token-2024',
    'Accept': 'application/json'
  },
  data: {
    email: 'test@example.com',
    password: 'password123'
  }
});
```

---

#### Configuration

**Environment Variables:**
```bash
# .env
APP_RATE_LIMIT_BYPASS_TOKEN=your-secure-token-here
```

**Config File:**
```php
// config/app.php
return [
    'rate_limit_bypass_token' => env('APP_RATE_LIMIT_BYPASS_TOKEN', 'test-bypass-token-2024'),
];
```

---

### CacheSanctumToken

**File:** `app/Http/Middleware/CacheSanctumToken.php`

**Purpose:** Cache Sanctum token lookups in Redis to eliminate database queries on every authenticated API request

**Performance Impact:**
- **Before:** Every API request = 1-2 DB queries (token lookup + user lookup)
- **After:** Every API request = 0 DB queries (Redis cache hit)
- **Cache TTL:** 1800 seconds (30 minutes)

**Dependencies:**
- `Illuminate\Support\Facades\Cache`
- `Laravel\Sanctum\PersonalAccessToken`

---

#### How It Works

```php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\PersonalAccessToken;

class CacheSanctumToken
{
    public function handle(Request $request, Closure $next)
    {
        // 1. Extract bearer token from Authorization header
        $bearerToken = $request->bearerToken();

        if (!$bearerToken) {
            return $next($request);
        }

        // 2. Create cache key from hashed token
        $cacheKey = 'sanctum:token:' . hash('sha256', $bearerToken);

        // 3. Cache token lookup (30 minutes)
        $cachedData = Cache::remember($cacheKey, 1800, function () use ($bearerToken) {
            $token = PersonalAccessToken::findToken($bearerToken);

            // Return null if token invalid or expired
            if (!$token || ($token->expires_at && $token->expires_at->isPast())) {
                return null;
            }

            return [
                'tokenable_type' => $token->tokenable_type,
                'tokenable_id' => $token->tokenable_id,
                'expires_at' => $token->expires_at?->toDateTimeString(),
            ];
        });

        // 4. Handle invalid/expired token
        if ($cachedData === null) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // 5. Cache user model (30 minutes)
        $userModel = $cachedData['tokenable_type'];
        $userId = $cachedData['tokenable_id'];

        $userCacheKey = "user:model:{$userId}";
        $user = Cache::remember($userCacheKey, 1800, function () use ($userModel, $userId) {
            return $userModel::find($userId);
        });

        // 6. Set authenticated user
        $request->setUserResolver(function () use ($user) {
            return $user;
        });

        return $next($request);
    }
}
```

---

#### Cache Keys Used

| Cache Key Pattern | Data Stored | TTL |
|-------------------|-------------|-----|
| `sanctum:token:{sha256}` | Token metadata (user ID, type, expiry) | 30 min |
| `user:model:{user_id}` | Full User model | 30 min |

---

#### Performance Benefits

**Scenario:** 1000 API requests per minute

| Without Cache | With Cache |
|---------------|------------|
| 2000 DB queries/min | ~1 DB query/30min |
| ~30ms avg response time | ~5ms avg response time |
| High DB load | Minimal DB load |

---

#### Cache Invalidation

**Automatic:** Cache expires after 30 minutes

**Manual (if needed):**
```php
// Clear specific token cache
$tokenHash = hash('sha256', $plainTextToken);
Cache::forget('sanctum:token:' . $tokenHash);

// Clear specific user cache
Cache::forget('user:model:' . $userId);

// Clear all sanctum caches (Redis CLI)
redis-cli KEYS "sanctum:token:*" | xargs redis-cli DEL
redis-cli KEYS "user:model:*" | xargs redis-cli DEL
```

---

#### Usage in Routes

```php
// bootstrap/app.php or routes/api.php
Route::middleware(['auth:sanctum', CacheSanctumToken::class])->group(function () {
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/files', [FileController::class, 'store']);
    Route::delete('/files/{id}', [FileController::class, 'destroy']);
});
```

**Important:** Apply this middleware AFTER `auth:sanctum` to intercept authentication logic.

---

#### Configuration

**Redis Configuration:**
```php
// config/database.php
'redis' => [
    'client' => env('REDIS_CLIENT', 'phpredis'),
    'default' => [
        'host' => env('REDIS_HOST', '127.0.0.1'),
        'password' => env('REDIS_PASSWORD', null),
        'port' => env('REDIS_PORT', 6379),
        'database' => env('REDIS_DB', 0),
    ],
],
```

**Environment Variables:**
```bash
# .env
REDIS_HOST=redis
REDIS_PORT=6379
CACHE_DRIVER=redis
```

---

### IsAdmin

**File:** `app/Http/Middleware/IsAdmin.php`

**Purpose:** Protect routes requiring admin privileges

**Authorization Check:** Verifies `$user->is_admin === true`

**Response on Failure:** 403 Forbidden with JSON error

---

#### Implementation

```php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class IsAdmin
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Check if user is authenticated and is admin
        if (!$request->user() || !$request->user()->is_admin) {
            return response()->json([
                'message' => 'Unauthorized. Admin access required.'
            ], 403);
        }

        return $next($request);
    }
}
```

---

#### Usage in Routes

```php
// routes/api.php
Route::middleware(['auth:sanctum', IsAdmin::class])->prefix('admin')->group(function () {
    // User management
    Route::get('/users', [AdminController::class, 'getUsers']);
    Route::get('/users/{id}', [AdminController::class, 'getUser']);
    Route::post('/users', [AdminController::class, 'createUser']);
    Route::put('/users/{id}', [AdminController::class, 'updateUser']);
    Route::delete('/users/{id}', [AdminController::class, 'deleteUser']);

    // File management
    Route::get('/files', [AdminController::class, 'getFiles']);
    Route::delete('/files/{id}', [AdminController::class, 'deleteFile']);

    // Dashboard
    Route::get('/dashboard', [AdminController::class, 'getDashboard']);
});
```

**Middleware Stack:**
1. `auth:sanctum` - Ensures user is authenticated
2. `IsAdmin` - Ensures user has admin privileges

---

#### User Model Integration

```php
// app/Models/User.php
protected $fillable = [
    'name',
    'email',
    'password',
    'is_admin', // Boolean flag
];

protected $casts = [
    'email_verified_at' => 'datetime',
    'password' => 'hashed',
    'is_admin' => 'boolean',
];
```

**Database Field:**
```sql
ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
```

---

#### Creating Admin Users

**Via Database:**
```sql
UPDATE users SET is_admin = TRUE WHERE email = 'admin@entoo.cz';
```

**Via Tinker:**
```php
php artisan tinker

$user = User::find(1);
$user->is_admin = true;
$user->save();
```

**Via Seeder:**
```php
// database/seeders/DatabaseSeeder.php
User::factory()->create([
    'name' => 'Admin User',
    'email' => 'admin@entoo.cz',
    'password' => bcrypt('admin123'),
    'is_admin' => true,
]);
```

---

## 2. Service Providers

### Overview

Service providers are the central place for registering services, bindings, event listeners, and middleware in the Laravel application.

---

### AppServiceProvider

**File:** `app/Providers/AppServiceProvider.php`

**Purpose:** General application-level service registration and bootstrapping

**Current Status:** Empty (default Laravel structure)

---

#### Implementation

```php
namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Register service bindings here
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Bootstrap application services here
    }
}
```

---

#### Common Use Cases

**Service Binding:**
```php
public function register(): void
{
    $this->app->singleton(ElasticsearchService::class, function ($app) {
        return new ElasticsearchService(
            config('services.elasticsearch.host'),
            config('services.elasticsearch.index')
        );
    });
}
```

**Model Observers:**
```php
public function boot(): void
{
    UploadedFile::observe(FileObserver::class);
}
```

**Pagination Defaults:**
```php
public function boot(): void
{
    Paginator::useBootstrapFive();
    Paginator::defaultView('pagination::bootstrap-5');
}
```

---

### AuthServiceProvider

**File:** `app/Providers/AuthServiceProvider.php`

**Purpose:** Register authorization policies for model-based access control

**Current Policies:**
- `UploadedFile::class` → `FilePolicy::class`

---

#### Implementation

```php
namespace App\Providers;

use App\Models\UploadedFile;
use App\Policies\FilePolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The model to policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        UploadedFile::class => FilePolicy::class,
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        //
    }
}
```

---

#### Policy Registration

**Automatic Discovery:** Laravel automatically discovers policies in `app/Policies/` if they follow naming convention:
- `App\Models\Post` → `App\Policies\PostPolicy`
- `App\Models\Comment` → `App\Policies\CommentPolicy`

**Manual Registration:** Use `$policies` array when:
- Policy doesn't follow naming convention
- Multiple models share one policy
- Need explicit control

---

#### Usage in Controllers

```php
// FileController.php
public function destroy(Request $request, int $id)
{
    $file = UploadedFile::findOrFail($id);

    // Authorize using FilePolicy@delete
    $this->authorize('delete', $file);

    // If authorized, continue...
    $file->delete();
}
```

**Policy Method Called:**
```php
// FilePolicy.php
public function delete(User $user, UploadedFile $file): bool
{
    return $user->id === $file->user_id || $user->is_admin;
}
```

---

### TelescopeServiceProvider

**File:** `app/Providers/TelescopeServiceProvider.php`

**Purpose:** Configure Laravel Telescope debugging and monitoring tool

**Key Features:**
- Request/response logging
- Database query monitoring
- Exception tracking
- Cache operation logging
- Job monitoring
- Sensitive data filtering

---

#### Configuration

```php
namespace App\Providers;

use Illuminate\Support\Facades\Gate;
use Laravel\Telescope\IncomingEntry;
use Laravel\Telescope\Telescope;
use Laravel\Telescope\TelescopeApplicationServiceProvider;

class TelescopeServiceProvider extends TelescopeApplicationServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        Telescope::night(); // Dark mode

        $this->hideSensitiveRequestDetails();

        Telescope::filter(function (IncomingEntry $entry) {
            $isLocal = $this->app->environment('local');

            if ($isLocal) {
                return true; // Log everything in local
            }

            // In production, only log important events
            return $entry->isReportableException() ||
                   $entry->isFailedRequest() ||
                   $entry->isFailedJob() ||
                   $entry->isScheduledTask() ||
                   $entry->hasMonitoredTag();
        });
    }

    /**
     * Prevent sensitive request details from being logged.
     */
    protected function hideSensitiveRequestDetails(): void
    {
        Telescope::hideRequestParameters(['_token']);

        Telescope::hideRequestHeaders([
            'cookie',
            'x-csrf-token',
            'x-xsrf-token',
        ]);
    }

    /**
     * Register the Telescope gate.
     *
     * This gate determines who can access Telescope in non-local environments.
     */
    protected function gate(): void
    {
        Gate::define('viewTelescope', function ($user) {
            return in_array($user->email, [
                // Add admin emails here
            ]) || $user->is_admin;
        });
    }
}
```

---

#### Access Control

**Local Environment:**
- Telescope available at: `http://localhost:8000/telescope`
- No authentication required
- All entries logged

**Production Environment:**
- Access controlled by `viewTelescope` gate
- Only admin users or whitelisted emails
- Filtered logging (exceptions, failures only)

---

#### Sensitive Data Filtering

**Hidden from Logs:**
- CSRF tokens (`_token`, `x-csrf-token`, `x-xsrf-token`)
- Cookie headers
- Authorization headers (configurable)
- Password fields (automatic Laravel behavior)

**Additional Filtering:**
```php
protected function hideSensitiveRequestDetails(): void
{
    Telescope::hideRequestParameters([
        '_token',
        'password',
        'password_confirmation',
        'api_token',
        'credit_card',
    ]);

    Telescope::hideRequestHeaders([
        'cookie',
        'authorization',
        'x-csrf-token',
        'x-xsrf-token',
    ]);
}
```

---

#### Entry Filtering Logic

| Environment | Condition | Logged Entries |
|-------------|-----------|----------------|
| **Local** | Always | All requests, queries, exceptions, jobs |
| **Production** | `isReportableException()` | Unhandled exceptions |
| **Production** | `isFailedRequest()` | HTTP 4xx/5xx responses |
| **Production** | `isFailedJob()` | Queue job failures |
| **Production** | `isScheduledTask()` | Scheduled task execution |
| **Production** | `hasMonitoredTag()` | Custom tagged entries |

---

#### Configuration File

**Location:** `config/telescope.php`

**Key Settings:**
```php
return [
    'enabled' => env('TELESCOPE_ENABLED', true),
    'path' => env('TELESCOPE_PATH', 'telescope'),
    'driver' => env('TELESCOPE_DRIVER', 'database'),
    'storage' => [
        'database' => [
            'connection' => env('DB_CONNECTION', 'pgsql'),
            'chunk' => 1000,
        ],
    ],
    'watchers' => [
        Watchers\RequestWatcher::class => ['enabled' => true],
        Watchers\QueryWatcher::class => ['enabled' => true, 'slow' => 50],
        Watchers\RedisWatcher::class => ['enabled' => true],
        Watchers\ExceptionWatcher::class => ['enabled' => true],
        Watchers\JobWatcher::class => ['enabled' => true],
        Watchers\CacheWatcher::class => ['enabled' => true],
    ],
];
```

---

#### Disabling Telescope

**Temporarily:**
```bash
# .env
TELESCOPE_ENABLED=false
```

**Permanently in Production:**
```php
// config/telescope.php
'enabled' => env('TELESCOPE_ENABLED', env('APP_ENV') === 'local'),
```

---

## 3. Queue Jobs

### Overview

Queue jobs handle asynchronous, time-intensive operations that shouldn't block HTTP requests. Jobs are processed by Laravel's queue workers.

---

### ProcessUploadedFile

**File:** `app/Jobs/ProcessUploadedFile.php`

**Purpose:** Extract text content from uploaded files and index them in Elasticsearch

**Queue:** `default`

**Configuration:**
- **Max Attempts:** 3 (will retry 2 times on failure)
- **Timeout:** 300 seconds (5 minutes)
- **Backoff:** None (immediate retry)

**Dependencies:**
- `DocumentParserService` - Text extraction
- `ElasticsearchService` - Document indexing

---

#### Class Structure

```php
namespace App\Jobs;

use App\Models\UploadedFile;
use App\Services\DocumentParserService;
use App\Services\ElasticsearchService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Cache;
use Exception;

class ProcessUploadedFile implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $timeout = 300;

    /**
     * Create a new job instance.
     */
    public function __construct(
        protected UploadedFile $uploadedFile
    ) {}

    /**
     * Execute the job.
     */
    public function handle(
        DocumentParserService $parserService,
        ElasticsearchService $elasticsearchService
    ): void {
        try {
            // Update status to processing
            $this->uploadedFile->update(['processing_status' => 'processing']);

            $fullPath = Storage::path($this->uploadedFile->filepath);

            // Extract text content
            $content = '';
            try {
                $content = $parserService->extractText(
                    $fullPath,
                    $this->uploadedFile->file_extension
                );
            } catch (Exception $e) {
                Log::warning("Failed to parse file content for file ID {$this->uploadedFile->id}", [
                    'file_id' => $this->uploadedFile->id,
                    'filepath' => $this->uploadedFile->filepath,
                    'error' => $e->getMessage(),
                ]);
            }

            // Index document in Elasticsearch
            $elasticsearchService->indexDocument([
                'file_id' => $this->uploadedFile->id,
                'user_id' => $this->uploadedFile->user_id,
                'filename' => $this->uploadedFile->filename,
                'original_filename' => $this->uploadedFile->original_filename,
                'filepath' => $this->uploadedFile->filepath,
                'subject_name' => $this->uploadedFile->subject_name,
                'category' => $this->uploadedFile->category,
                'file_extension' => $this->uploadedFile->file_extension,
                'file_size' => $this->uploadedFile->file_size,
                'content' => $content,
                'created_at' => $this->uploadedFile->created_at->toIso8601String(),
                'updated_at' => $this->uploadedFile->updated_at->toIso8601String(),
            ]);

            // Update status to completed
            $this->uploadedFile->update([
                'processing_status' => 'completed',
                'processed_at' => now()
            ]);

            // Clear related caches
            $this->clearFileRelatedCaches();

        } catch (Exception $e) {
            // Update status to failed
            $this->uploadedFile->update([
                'processing_status' => 'failed',
                'processing_error' => $e->getMessage()
            ]);

            Log::error("Failed to process uploaded file", [
                'file_id' => $this->uploadedFile->id,
                'attempt' => $this->attempts(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            // Re-throw to trigger retry
            throw $e;
        }
    }

    /**
     * Clear caches related to this file.
     */
    protected function clearFileRelatedCaches(): void
    {
        // Clear file list caches
        Cache::tags(['files'])->flush();

        // Clear subject-specific caches
        Cache::forget("files:subject:{$this->uploadedFile->subject_name}");
        Cache::forget("files:subject:{$this->uploadedFile->subject_name}:category:{$this->uploadedFile->category}");

        // Clear stats cache
        Cache::forget('system:stats:comprehensive');
    }
}
```

---

#### Job Lifecycle

```
1. File Upload (HTTP Request)
   ↓
2. Create UploadedFile Record (status: 'pending')
   ↓
3. Dispatch ProcessUploadedFile Job
   ↓
4. Job Picked Up by Queue Worker
   ↓
5. Status: 'processing'
   ↓
6. Extract Text Content (DocumentParserService)
   ↓
7. Index in Elasticsearch (ElasticsearchService)
   ↓
8. Status: 'completed' + processed_at timestamp
   ↓
9. Clear Related Caches
```

---

#### Error Handling

**Parsing Errors (Non-Fatal):**
- File content extraction fails
- Job continues with empty content
- Warning logged but job succeeds
- File still indexed in Elasticsearch (metadata only)

**Indexing Errors (Fatal):**
- Elasticsearch indexing fails
- Status set to 'failed' with error message
- Exception re-thrown
- Job retried (up to 3 attempts total)

---

#### Retry Strategy

| Attempt | Behavior |
|---------|----------|
| **1** | Initial execution |
| **2** | Immediate retry after first failure |
| **3** | Immediate retry after second failure |
| **Failed** | Job marked as failed, status = 'failed' |

**No Backoff:** Retries happen immediately without delay. To add exponential backoff:

```php
public $backoff = [10, 30, 60]; // Retry after 10s, 30s, 60s
```

---

#### Processing Status Field

**Database Column:** `uploaded_files.processing_status`

**Possible Values:**

| Status | Meaning | Transitions To |
|--------|---------|----------------|
| `pending` | File uploaded, job queued | `processing` |
| `processing` | Job executing | `completed` or `failed` |
| `completed` | Successfully processed | N/A (terminal state) |
| `failed` | Processing failed after retries | N/A (terminal state) |

---

#### Queue Configuration

**Driver:** Redis (configured in `config/queue.php`)

```php
'connections' => [
    'redis' => [
        'driver' => 'redis',
        'connection' => 'default',
        'queue' => env('REDIS_QUEUE', 'default'),
        'retry_after' => 360, // 6 minutes (longer than job timeout)
        'block_for' => null,
    ],
],
```

**Environment Variables:**
```bash
# .env
QUEUE_CONNECTION=redis
REDIS_QUEUE=default
```

---

#### Starting Queue Workers

**Development (Docker):**
```bash
docker exec -it php php artisan queue:work --tries=3 --timeout=300
```

**Production (Supervisor):**
```ini
[program:entoo-queue-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/html/artisan queue:work redis --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/var/www/html/storage/logs/queue-worker.log
stopwaitsecs=3600
```

---

#### Monitoring Jobs

**Via Artisan:**
```bash
# Show failed jobs
php artisan queue:failed

# Retry failed job
php artisan queue:retry {job-id}

# Retry all failed jobs
php artisan queue:retry all

# Clear failed jobs
php artisan queue:flush
```

**Via Database:**
```sql
-- Check job status
SELECT * FROM jobs;
SELECT * FROM failed_jobs;

-- Check file processing status
SELECT processing_status, COUNT(*)
FROM uploaded_files
GROUP BY processing_status;
```

**Via Telescope:**
- View jobs at: `http://localhost:8000/telescope/jobs`
- See execution time, attempts, exceptions
- Monitor queue performance

---

#### Dispatching the Job

**In FileController:**
```php
public function store(Request $request)
{
    // Validate and create file record
    $uploadedFile = UploadedFile::create([
        'user_id' => $request->user()->id,
        'filename' => $filename,
        'original_filename' => $file->getClientOriginalName(),
        'filepath' => $path,
        'subject_name' => $request->subject_name,
        'category' => $request->category,
        'file_extension' => $extension,
        'file_size' => $file->getSize(),
        'processing_status' => 'pending',
    ]);

    // Dispatch job for background processing
    ProcessUploadedFile::dispatch($uploadedFile);

    return response()->json([
        'message' => 'File uploaded successfully',
        'file' => $uploadedFile
    ], 201);
}
```

---

#### Cache Invalidation Strategy

**Caches Cleared:**
1. **Tag-based flush:** `files` tag (if using cache tags)
2. **Subject-specific:** `files:subject:{subject_name}`
3. **Subject + category:** `files:subject:{subject_name}:category:{category}`
4. **System stats:** `system:stats:comprehensive`

**Why Clear Caches:**
- File counts changed (dashboard display)
- Subject file list changed (browse page)
- System statistics changed (stats API)

---

#### Testing the Job

**PHPUnit Test:**
```php
use App\Jobs\ProcessUploadedFile;
use App\Models\UploadedFile;
use Illuminate\Support\Facades\Queue;

public function test_file_upload_dispatches_processing_job()
{
    Queue::fake();

    $response = $this->actingAs($this->user)
        ->postJson('/api/files', [
            'file' => UploadedFile::fake()->create('test.pdf', 100),
            'subject_name' => 'Math',
            'category' => 'Materialy',
        ]);

    Queue::assertPushed(ProcessUploadedFile::class);
}

public function test_job_processes_file_successfully()
{
    $file = UploadedFile::factory()->create(['processing_status' => 'pending']);

    $job = new ProcessUploadedFile($file);
    $job->handle(
        app(DocumentParserService::class),
        app(ElasticsearchService::class)
    );

    $this->assertEquals('completed', $file->fresh()->processing_status);
    $this->assertNotNull($file->fresh()->processed_at);
}
```

---

## Common Workflows

### 1. File Upload and Processing

```
User uploads file
  ↓
FileController@store
  ↓
Create UploadedFile record (status: 'pending')
  ↓
Dispatch ProcessUploadedFile job
  ↓
Return 201 response immediately
  ↓
[Background] Queue worker picks up job
  ↓
Update status to 'processing'
  ↓
Extract text content (5-60 seconds)
  ↓
Index in Elasticsearch
  ↓
Update status to 'completed'
  ↓
Clear related caches
```

---

### 2. Rate-Limited API Request with Bypass

```
E2E Test sends request
  ↓
ConditionalThrottle middleware
  ↓
Check X-Bypass-Rate-Limit header
  ↓
Token matches → bypass rate limiting
  ↓
CacheSanctumToken middleware
  ↓
Check Redis cache for token
  ↓
Cache hit → load user from cache
  ↓
Set authenticated user
  ↓
Continue to controller
```

---

### 3. Admin-Protected Route Access

```
User sends request to /api/admin/users
  ↓
auth:sanctum middleware
  ↓
Authenticate user via Sanctum
  ↓
IsAdmin middleware
  ↓
Check $user->is_admin
  ↓
is_admin === true → allow access
  ↓
AdminController@getUsers
  ↓
Return user list
```

---

## Configuration Reference

### Middleware Registration

**File:** `bootstrap/app.php`

```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->alias([
        'admin' => \App\Http\Middleware\IsAdmin::class,
        'cache.sanctum' => \App\Http\Middleware\CacheSanctumToken::class,
        'throttle.conditional' => \App\Http\Middleware\ConditionalThrottle::class,
    ]);
})
```

---

### Provider Registration

**File:** `bootstrap/app.php` or `config/app.php`

```php
'providers' => [
    // Other providers...
    App\Providers\AppServiceProvider::class,
    App\Providers\AuthServiceProvider::class,
    App\Providers\TelescopeServiceProvider::class,
],
```

---

### Queue Configuration

**File:** `config/queue.php`

```php
'default' => env('QUEUE_CONNECTION', 'redis'),

'connections' => [
    'redis' => [
        'driver' => 'redis',
        'connection' => 'default',
        'queue' => env('REDIS_QUEUE', 'default'),
        'retry_after' => 360,
        'block_for' => null,
    ],
],
```

---

## Troubleshooting

### Issue: Rate Limit Bypass Not Working

**Symptoms:** E2E tests hitting rate limits despite header

**Check:**
```bash
# Verify environment
echo $APP_ENV  # Should be 'testing' or 'local'

# Check config
php artisan config:cache
php artisan config:clear
```

**Solution:**
- Ensure `X-Bypass-Rate-Limit` header is sent with correct token
- Verify token in `.env`: `APP_RATE_LIMIT_BYPASS_TOKEN`
- Check email pattern if using test user bypass

---

### Issue: Token Caching Not Working

**Symptoms:** Still seeing DB queries for token lookups

**Check:**
```bash
# Test Redis connection
docker exec -it redis redis-cli ping  # Should return "PONG"

# Check cache driver
php artisan config:cache
grep CACHE_DRIVER .env  # Should be 'redis'
```

**Solution:**
- Ensure Redis is running: `docker-compose ps redis`
- Clear config cache: `php artisan config:clear`
- Verify middleware is applied AFTER `auth:sanctum`

---

### Issue: Jobs Not Processing

**Symptoms:** Files stuck in 'pending' status

**Check:**
```bash
# Check queue worker is running
docker exec -it php ps aux | grep queue:work

# Check failed jobs
docker exec -it php php artisan queue:failed
```

**Solution:**
- Start queue worker: `docker exec -it php php artisan queue:work`
- Retry failed jobs: `php artisan queue:retry all`
- Check logs: `storage/logs/laravel.log`

---

### Issue: Telescope Not Accessible

**Symptoms:** 404 or 403 when accessing /telescope

**Check:**
```bash
# Check if enabled
grep TELESCOPE_ENABLED .env

# Check environment
echo $APP_ENV
```

**Solution:**
- Enable in `.env`: `TELESCOPE_ENABLED=true`
- Clear config: `php artisan config:clear`
- In production, ensure user is admin or whitelisted in `TelescopeServiceProvider@gate()`

---

**Last Updated:** 2025-11-13
**Version:** 1.0
**Maintained By:** Development Team
