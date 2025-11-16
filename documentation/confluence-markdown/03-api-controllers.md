# API Controllers Documentation

## Overview

Entoo's API is built with RESTful controllers organized by resource type. All controllers extend the base `Controller` class and use Laravel Sanctum for authentication.

---

## OpenAPI/Swagger Documentation

**Complete interactive API documentation is available via Swagger UI:**

- **URL:** http://localhost:8000/api/documentation
- **Format:** OpenAPI 3.0.0
- **Features:**
  - Interactive "Try it out" functionality
  - Request/response schemas with validation rules
  - Authentication support (Bearer token)
  - Organized by tags (Authentication, Files, Search, etc.)
  - 28 documented endpoints across 8 controllers

**Exported Documentation:**
- **File:** `documentation/entoo-api-swagger.json` (117 KB)
- **Use:** Import into Confluence, Postman, or other API tools
- **Regenerate:** `docker exec php php artisan l5-swagger:generate`

> **💡 TIP:** The Swagger UI provides a more interactive way to explore and test the API compared to this static documentation.

---

## Controller Overview

| Controller | Resource | Authentication | Purpose |
|------------|----------|----------------|---------|
| **AuthController** | User authentication | Public + Protected | Registration, login, password management |
| **FileController** | File uploads/downloads | Mixed | File CRUD operations and browsing |
| **SearchController** | Search | Public | Elasticsearch-powered search |
| **SubjectController** | Subjects | Public | Subject listing and categories |
| **FavoriteController** | User favorites | Protected | Favorite subject management |
| **SubjectProfileController** | Subject profiles | Mixed | Subject metadata CRUD |
| **HealthController** | System health | Public | Health checks and statistics |
| **AdminController** | Admin operations | Admin only | User and file administration |

---

## Authentication Flow

### Token Types

**API Token:** `Authorization: Bearer {token}`
- Generated via `/api/auth/login` or `/api/auth/register`
- Stored in `personal_access_tokens` table
- Revoked on logout or password change

### Middleware

| Middleware | Applied To | Effect |
|------------|-----------|--------|
| `auth:sanctum` | Protected routes | Requires valid API token |
| `throttle` | All API routes | Rate limiting (60/min default) |
| `IsAdmin` | Admin routes | Requires `is_admin = true` |

---

## 1. AuthController

**File:** `webapp/app/Http/Controllers/Api/AuthController.php`

**Base Route:** `/api/auth`

**Purpose:** Handle user authentication, registration, and password management

### POST /api/auth/register

**Purpose:** Register a new user account

**Authentication:** Public

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "password_confirmation": "password123"
}
```

**Validation Rules:**

| Field | Rules |
|-------|-------|
| name | required, string, max:255 |
| email | required, email, max:255, unique:users |
| password | required, string, min:8, confirmed |

**Response (201):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "token": "1|abc123...",
  "token_type": "Bearer"
}
```

---

### POST /api/auth/login

**Purpose:** Login and obtain API token

**Authentication:** Public

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Validation Rules:**

| Field | Rules |
|-------|-------|
| email | required, email |
| password | required |

**Behavior:**
- Verifies email and password
- Revokes all previous tokens (single session)
- Creates new token

**Response (200):**
```json
{
  "message": "Login successful",
  "user": {...},
  "token": "2|xyz789...",
  "token_type": "Bearer"
}
```

**Error (422):**
```json
{
  "message": "The provided credentials are incorrect.",
  "errors": {
    "email": ["The provided credentials are incorrect."]
  }
}
```

---

### POST /api/auth/logout

**Purpose:** Logout and revoke current token

**Authentication:** Required (`auth:sanctum`)

**Request:** No body required

**Behavior:**
- Deletes only the current access token
- Other tokens (other devices) remain valid

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

---

### GET /api/auth/user

**Purpose:** Get authenticated user information

**Authentication:** Required (`auth:sanctum`)

**Response (200):**
```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "is_admin": false,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

---

### GET /api/auth/profile

**Purpose:** Get user profile with detailed statistics

**Authentication:** Required (`auth:sanctum`)

**Response (200):**
```json
{
  "user": {...},
  "stats": {
    "total_files": 42,
    "total_size": 104857600,
    "total_size_formatted": "100.00 MB",
    "files_by_category": {
      "Materialy": 15,
      "Prednasky": 12,
      "Otazky": 10,
      "Seminare": 5
    }
  },
  "recent_uploads": [...]
}
```

**Statistics Included:**
- Total files uploaded by user
- Total storage used
- Breakdown by category
- Last 10 uploaded files

---

### POST /api/auth/change-password

**Purpose:** Change user password (when logged in)

**Authentication:** Required (`auth:sanctum`)

**Request Body:**
```json
{
  "current_password": "oldpassword123",
  "new_password": "newpassword456",
  "new_password_confirmation": "newpassword456"
}
```

**Validation Rules:**

| Field | Rules |
|-------|-------|
| current_password | required, string |
| new_password | required, string, min:8, confirmed |

**Behavior:**
- Verifies current password
- Updates password (hashed)
- Revokes ALL tokens (force re-login on all devices)

**Response (200):**
```json
{
  "message": "Password changed successfully. Please log in again."
}
```

**Error (422):**
```json
{
  "message": "Current password is incorrect",
  "errors": {
    "current_password": ["The current password is incorrect"]
  }
}
```

---

### POST /api/auth/forgot-password

**Purpose:** Request password reset email

**Authentication:** Public

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Validation:**

| Field | Rules |
|-------|-------|
| email | required, email, exists:users,email |

**Behavior:**
- Generates password reset token
- Sends reset link via email
- Uses Laravel's built-in `Password` facade

**Response (200):**
```json
{
  "message": "Password reset instructions have been sent to your email address."
}
```

---

### POST /api/auth/reset-password

**Purpose:** Reset password using email token

**Authentication:** Public

**Request Body:**
```json
{
  "email": "john@example.com",
  "token": "abc123...",
  "password": "newpassword789",
  "password_confirmation": "newpassword789"
}
```

**Validation:**

| Field | Rules |
|-------|-------|
| email | required, email, exists:users,email |
| token | required, string |
| password | required, string, min:8, confirmed |

**Behavior:**
- Verifies reset token validity
- Updates password
- Generates new remember token
- Revokes all Sanctum tokens
- Fires `PasswordReset` event

**Response (200):**
```json
{
  "message": "Password has been reset successfully. Please log in with your new password."
}
```

**Error (422):**
```json
{
  "message": "Password reset failed. The token may be invalid or expired.",
  "errors": {
    "email": ["..."]
  }
}
```

---

## 2. FileController

**File:** `webapp/app/Http/Controllers/Api/FileController.php`

**Base Route:** `/api/files`

**Purpose:** Manage file uploads, downloads, and browsing

**Dependencies:**
- `DocumentParserService` - Text extraction
- `ElasticsearchService` - Fast querying
- `ProcessUploadedFile` Job - Async processing

### GET /api/files

**Purpose:** List all files with filtering (optimized with caching)

**Authentication:** Required (`auth:sanctum`)

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| subject_name | string | Filter by subject |
| category | string | Filter by category (Materialy, etc.) |
| extension | string | Filter by file extension |
| user_id | integer | Filter by uploader |
| per_page | integer | Results per page (default: 20, max: 1000) |
| page | integer | Page number |

**Optimization Strategy:**

> **Fast Path (Elasticsearch):**
> - Used when ONLY `subject_name` is provided
> - 10-100x faster than PostgreSQL
> - Cached for 5 minutes
> - Returns up to 1000 files
>
> **Normal Path (PostgreSQL):**
> - Used for complex queries (multiple filters)
> - Paginated results
> - Cached for 5 minutes

**Cache Keys:**
- Elasticsearch: `files:es:subject:{md5(subject_name)}`
- PostgreSQL: `files:{md5(query_params)}`
- Tagged with: `['files']` or `['files', 'subjects']`

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "filename": "uuid.pdf",
      "original_filename": "lecture-notes.pdf",
      "subject_name": "Programming Basics",
      "category": "Materialy",
      "file_size": 1048576,
      "file_extension": "pdf",
      "created_at": "2024-01-01T00:00:00Z",
      "user": {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  ],
  "total": 42,
  "current_page": 1,
  "per_page": 20
}
```

---

### POST /api/files

**Purpose:** Upload a new file

**Authentication:** Required (`auth:sanctum`)

**Content-Type:** `multipart/form-data`

**Request:**

| Field | Type | Rules |
|-------|------|-------|
| file | file | required, max:51200 (50MB) |
| subject_name | string | required, max:200 |
| category | string | required, in:Prednasky,Otazky,Materialy,Seminare |

**Supported File Types:**
- pdf, doc, docx, ppt, pptx, txt

**Process:**
1. Validates file type against supported extensions
2. Generates UUID filename
3. Stores in: `uploads/{subject-slug}/{category-slug}/{uuid}.{ext}`
4. Creates database record with `processing_status = 'pending'`
5. Dispatches `ProcessUploadedFile` job (async)
6. Returns immediately (file processes in background)

**Response (201):**
```json
{
  "message": "File uploaded successfully and is being processed",
  "file": {
    "id": 1,
    "filename": "abc-123.pdf",
    "original_filename": "notes.pdf",
    "processing_status": "pending",
    "..."
  },
  "status": "processing"
}
```

**Error (422) - Unsupported Type:**
```json
{
  "message": "Unsupported file type",
  "supported_types": ["pdf", "doc", "docx", "ppt", "pptx", "txt"]
}
```

---

### GET /api/files/{id}

**Purpose:** Get file details

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Any authenticated user can view (public sharing)

**Response (200):**
```json
{
  "file": {
    "id": 1,
    "filename": "uuid.pdf",
    "original_filename": "lecture-notes.pdf",
    "filepath": "uploads/programming-basics/materialy/uuid.pdf",
    "subject_name": "Programming Basics",
    "category": "Materialy",
    "file_size": 1048576,
    "file_extension": "pdf",
    "processing_status": "completed",
    "processed_at": "2024-01-01T00:05:00Z",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:05:00Z"
  }
}
```

---

### GET /api/files/{id}/status

**Purpose:** Check file processing status

**Authentication:** Required (`auth:sanctum`)

**Use Case:** Poll this endpoint after upload to check if processing is complete

**Response (200):**
```json
{
  "id": 1,
  "processing_status": "completed",
  "processing_error": null,
  "processed_at": "2024-01-01T00:05:00Z"
}
```

**Processing Status Values:**
- `pending` - Queued for processing
- `processing` - Currently being processed
- `completed` - Successfully processed and indexed
- `failed` - Processing failed (see processing_error)

---

### GET /api/files/{id}/download

**Purpose:** Download file

**Authentication:** Required (`auth:sanctum`)

**Authorization:** All authenticated users can download (document sharing platform)

**Behavior:**
- Checks absolute paths first (imported files)
- Falls back to Laravel storage for uploaded files
- Returns file with original filename
- No authorization policy check (performance optimization for Octane)

**Response:**
- File download with correct Content-Disposition header
- Original filename preserved

**Error (404):**
```json
{
  "message": "File not found on disk"
}
```

**File Path Resolution:**
1. Check if absolute path (imported from old_entoo)
2. Check Laravel storage: `storage/app/{filepath}`
3. Return 404 if neither found

---

### DELETE /api/files/{id}

**Purpose:** Delete file

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Only file owner can delete (via FilePolicy)

**Process:**
1. Authorizes delete action (owner only)
2. Deletes from Laravel storage
3. Deletes from Elasticsearch (non-fatal if fails)
4. Deletes database record
5. Clears all file-related caches

**Response (200):**
```json
{
  "message": "File deleted successfully"
}
```

**Error (403):**
```json
{
  "message": "This action is unauthorized."
}
```

**Cache Clearing:**
- Flushes `['files']` tag
- Flushes `['subjects']` tag
- Forgets: `system:stats:comprehensive`, `subjects:with_counts`, `subjects:list`

---

### GET /api/files/browse

**Purpose:** Browse files with filtering (alternative endpoint)

**Authentication:** Required (`auth:sanctum`)

**Query Parameters:**

| Parameter | Rules |
|-----------|-------|
| subject_name | sometimes, string, max:200 |
| category | sometimes, in:Prednasky,Otazky,Materialy,Seminare |
| user_id | sometimes, integer, exists:users,id |
| page | integer (default: 1) |

**Caching:**
- Cache key: `files:browse:{md5(params)}`
- TTL: 300 seconds (5 minutes)
- Tagged with: `['files']`

**Response:**
- Paginated (20 per page)
- Ordered by created_at desc
- Eager loads user relationship

---

## 3. SearchController

**File:** `webapp/app/Http/Controllers/Api/SearchController.php`

**Base Route:** `/api/search`

**Purpose:** Full-text search across all indexed documents

**Dependencies:**
- `ElasticsearchService` - Search engine

### GET /api/search

**Purpose:** Search documents with fuzzy matching

**Authentication:** Public (searches all files globally)

**Query Parameters:**

| Parameter | Type | Required | Rules |
|-----------|------|----------|-------|
| q | string | Yes | min:1 (search query) |
| subject_name | string | No | max:200 |
| category | string | No | in:Prednasky,Otazky,Materialy,Seminare |
| file_extension | string | No | max:10 |
| size | integer | No | min:1, max:100 (default: 20) |

**Search Features:**
- **Multi-field search:** filename, original_filename, subject_name, content
- **Field boosting:**
  - filename: 3x weight
  - original_filename: 2x weight
  - subject_name: 2x weight
  - content: 1x weight
- **Fuzzy matching:** AUTO fuzziness (handles typos)
- **Highlighting:** Shows matching snippets from content
- **Sorting:** Relevance (_score) desc, then created_at desc

**Request Example:**
```
GET /api/search?q=algorithm&subject_name=Data Structures&category=Prednasky&size=10
```

**Response (200):**
```json
{
  "query": "algorithm",
  "total": 15,
  "results": [
    {
      "file_id": "42",
      "score": 8.5,
      "source": {
        "filename": "algorithms-lecture.pdf",
        "original_filename": "Algorithms Lecture 01.pdf",
        "subject_name": "Data Structures",
        "category": "Prednasky",
        "file_extension": "pdf",
        "file_size": 2048576,
        "created_at": "2024-01-01T00:00:00Z"
      },
      "highlight": {
        "content": [
          "...sorting <em>algorithms</em> are fundamental...",
          "...the <em>algorithm</em> complexity is O(n log n)..."
        ]
      }
    }
  ]
}
```

**Highlight Configuration:**
- Max offset: 10MB
- Fragment size: 150 characters
- Number of fragments: 3
- Highlights matching terms in content

---

## 4. SubjectController

**File:** `webapp/app/Http/Controllers/Api/SubjectController.php`

**Base Route:** `/api/subjects`

**Purpose:** List subjects and their categories

**Dependencies:**
- `ElasticsearchService` - Fast aggregations

### GET /api/subjects

**Purpose:** Get all unique subjects

**Authentication:** Required (`auth:sanctum`)

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| with_counts | boolean | false | Include file counts and profile status |

**Without Counts:**
- Simple list of subject names
- Cached for 30 minutes (`subjects:list`)
- Fast PostgreSQL query

**With Counts:**
- Uses Elasticsearch aggregations (MUCH faster)
- Includes file count per subject
- Includes profile existence flag
- Cached for 30 minutes (`subjects:with_counts`)

**Response (with_counts=false):**
```json
{
  "subjects": [
    "Algorithms",
    "Data Structures",
    "Operating Systems",
    "Programming Basics"
  ]
}
```

**Response (with_counts=true):**
```json
{
  "subjects": [
    {
      "subject_name": "Programming Basics",
      "file_count": 42,
      "has_profile": true
    },
    {
      "subject_name": "Algorithms",
      "file_count": 28,
      "has_profile": false
    }
  ]
}
```

**Cache Headers:**
- `Cache-Control: public, max-age=300` (5 min client cache)

**Performance:**
- Elasticsearch aggregation: ~10-50ms
- PostgreSQL group by: ~500-2000ms (for large datasets)

---

### GET /api/subjects/{subjectName}

**Purpose:** Get categories and file counts for a subject

**Authentication:** Required (`auth:sanctum`)

**Returns:** All 4 valid categories with file counts (including zeros)

**Caching:**
- Key: `subject:{md5(subjectName)}:categories`
- TTL: 300 seconds (5 minutes)
- Tagged with: `['subjects', 'files']`

**Response:**
```json
{
  "subject_name": "Programming Basics",
  "categories": [
    {
      "category": "Materialy",
      "file_count": 15
    },
    {
      "category": "Otazky",
      "file_count": 10
    },
    {
      "category": "Prednasky",
      "file_count": 12
    },
    {
      "category": "Seminare",
      "file_count": 5
    }
  ]
}
```

> **Note:** Always returns all 4 categories, even if some have 0 files

---

### GET /api/subjects/categories

**Purpose:** Get list of valid categories

**Authentication:** Required (`auth:sanctum`)

**Response:**
```json
{
  "categories": [
    "Prednasky",
    "Otazky",
    "Materialy",
    "Seminare"
  ]
}
```

**Use Case:** Populate dropdown menus in UI

---

## 5. FavoriteController

**File:** `webapp/app/Http/Controllers/Api/FavoriteController.php`

**Base Route:** `/api/favorites`

**Purpose:** Manage user's favorite subjects

### GET /api/favorites

**Purpose:** Get user's favorite subjects

**Authentication:** Required (`auth:sanctum`)

**Caching:**
- Key: `favorites:user:{userId}`
- TTL: 1800 seconds (30 minutes)

**Response:**
```json
{
  "favorites": [
    {
      "id": 1,
      "user_id": 1,
      "subject_name": "Programming Basics",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    {
      "id": 2,
      "user_id": 1,
      "subject_name": "Algorithms",
      "created_at": "2024-01-02T00:00:00Z",
      "updated_at": "2024-01-02T00:00:00Z"
    }
  ]
}
```

**Cache Headers:**
- `Cache-Control: private, max-age=300` (5 min client cache, private to user)

---

### POST /api/favorites

**Purpose:** Add subject to favorites

**Authentication:** Required (`auth:sanctum`)

**Request Body:**
```json
{
  "subject_name": "Data Structures"
}
```

**Validation:**

| Field | Rules |
|-------|-------|
| subject_name | required, string, max:200 |

**Behavior:**
- Checks if already favorited (idempotent)
- Creates new favorite if doesn't exist
- Clears user's favorites cache

**Response (201) - Created:**
```json
{
  "message": "Subject added to favorites",
  "favorite": {
    "id": 3,
    "user_id": 1,
    "subject_name": "Data Structures",
    "created_at": "2024-01-03T00:00:00Z",
    "updated_at": "2024-01-03T00:00:00Z"
  }
}
```

**Response (200) - Already Exists:**
```json
{
  "message": "Subject already in favorites",
  "favorite": {...}
}
```

---

### DELETE /api/favorites/{id}

**Purpose:** Remove subject from favorites

**Authentication:** Required (`auth:sanctum`)

**Authorization:** User can only delete their own favorites

**Behavior:**
- Finds favorite by ID and user_id (scoped to user)
- Deletes favorite
- Clears user's favorites cache

**Response (200):**
```json
{
  "message": "Subject removed from favorites"
}
```

**Error (404):**
- Favorite not found or doesn't belong to user

---

## 6. SubjectProfileController

**File:** `webapp/app/Http/Controllers/Api/SubjectProfileController.php`

**Base Route:** `/api/subject-profiles`

**Purpose:** CRUD operations for subject profiles (rich metadata)

### GET /api/subject-profiles

**Purpose:** Get all subject profiles

**Authentication:** Required (`auth:sanctum`)

**Response:**
```json
{
  "profiles": [
    {
      "id": 1,
      "subject_name": "Programming Basics",
      "description": "Introduction to programming concepts...",
      "professor_name": "Dr. Smith",
      "course_code": "CS101",
      "semester": "Winter",
      "year": 2024,
      "credits": 5,
      "color": "#3B82F6",
      "notes": "Prerequisites: None",
      "created_by": 1,
      "updated_by": 1,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "creator": {
        "id": 1,
        "name": "Admin User"
      },
      "updater": {
        "id": 1,
        "name": "Admin User"
      },
      "file_count": 42
    }
  ]
}
```

**Features:**
- Eager loads creator and updater relationships
- Includes file count via `withCount('uploadedFiles')`
- Ordered by subject_name alphabetically

---

### GET /api/subject-profiles/{subjectName}

**Purpose:** Get single subject profile by name

**Authentication:** Required (`auth:sanctum`)

**Response (200):**
```json
{
  "profile": {
    "id": 1,
    "subject_name": "Programming Basics",
    "description": "Introduction to programming...",
    "..."
  }
}
```

**Response (404) - No Profile:**
```json
{
  "profile": null,
  "message": "No profile found for this subject"
}
```

---

### POST /api/subject-profiles

**Purpose:** Create new subject profile

**Authentication:** Required (`auth:sanctum`)

**Request Body:**
```json
{
  "subject_name": "Advanced Algorithms",
  "description": "Deep dive into algorithm design and analysis...",
  "professor_name": "Dr. Johnson",
  "course_code": "CS301",
  "semester": "Spring",
  "year": 2024,
  "credits": 5,
  "color": "#8B5CF6",
  "notes": "Prerequisites: Data Structures"
}
```

**Validation:**

| Field | Rules |
|-------|-------|
| subject_name | required, string, max:255, unique:subject_profiles |
| description | nullable, string |
| professor_name | nullable, string, max:255 |
| course_code | nullable, string, max:50 |
| semester | nullable, string, max:50 |
| year | nullable, integer, min:2000, max:2100 |
| credits | nullable, integer, min:0, max:20 |
| color | nullable, string, max:7 (hex color) |
| notes | nullable, string |

**Automatic Fields:**
- `created_by` - Set to current user ID
- `updated_by` - Set to current user ID

**Response (201):**
```json
{
  "message": "Subject profile created successfully",
  "profile": {...}
}
```

---

### PUT/PATCH /api/subject-profiles/{subjectName}

**Purpose:** Update existing profile

**Authentication:** Required (`auth:sanctum`)

**Request Body:** (all fields optional)
```json
{
  "description": "Updated description...",
  "professor_name": "Dr. Johnson",
  "year": 2025
}
```

**Validation:** Same as create, but all fields optional

**Automatic Fields:**
- `updated_by` - Set to current user ID
- `subject_name` - Cannot be changed

**Response (200):**
```json
{
  "message": "Subject profile updated successfully",
  "profile": {...}
}
```

---

### DELETE /api/subject-profiles/{subjectName}

**Purpose:** Delete subject profile

**Authentication:** Required (`auth:sanctum`)

> **Note:** Does NOT delete associated files (only metadata)

**Response (200):**
```json
{
  "message": "Subject profile deleted successfully"
}
```

---

## 7. HealthController

**File:** `webapp/app/Http/Controllers/Api/HealthController.php`

**Base Route:** `/api`

**Purpose:** System health monitoring and statistics

**Dependencies:**
- `ElasticsearchService` - For stats aggregations

### GET /api/health

**Purpose:** Check system health

**Authentication:** Public

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00Z",
  "services": {
    "database": "connected",
    "elasticsearch": "connected"
  }
}
```

**Status Values:**
- `ok` - All services healthy
- `degraded` - One or more services unhealthy

**Service Status:**
- `connected` - Service is operational
- `unreachable` - Service ping failed
- `error` - Exception occurred

**Use Cases:**
- Load balancer health checks
- Monitoring systems
- Deployment verification

---

### GET /api/stats

**Purpose:** Get comprehensive system statistics

**Authentication:** Public

**Caching:**
- Key: `system:stats:comprehensive`
- TTL: 1800 seconds (30 minutes)
- Uses Elasticsearch for fast aggregations

**Response:**
```json
{
  "total_files": 1250,
  "total_subjects": 42,
  "total_users": 156,
  "total_storage_bytes": 2147483648,
  "files_by_category": [
    {
      "category": "Materialy",
      "count": 450
    },
    {
      "category": "Prednasky",
      "count": 380
    },
    {
      "category": "Otazky",
      "count": 250
    },
    {
      "category": "Seminare",
      "count": 170
    }
  ],
  "files_by_extension": [
    {
      "file_extension": "pdf",
      "count": 890
    },
    {
      "file_extension": "docx",
      "count": 210
    },
    {
      "file_extension": "pptx",
      "count": 150
    }
  ],
  "cached_at": "2024-01-01T12:00:00Z"
}
```

**Cache Headers:**
- `Cache-Control: public, max-age=300` (5 min client cache)
- `X-Cache-Generated: {timestamp}` (when cache was created)

**Performance:**
- Elasticsearch aggregations: ~10-50ms
- PostgreSQL alternative: ~2-10 seconds (for large datasets)

**Data Sources:**
- Elasticsearch: files, subjects, storage, categories, extensions
- PostgreSQL: user count only

---

## 8. AdminController

**File:** `webapp/app/Http/Controllers/Api/AdminController.php`

**Base Route:** `/api/admin`

**Purpose:** Administrative operations for user and file management

**Authentication:** Required (`auth:sanctum` + `IsAdmin` middleware)

**Authorization:** Only users with `is_admin = true` can access

### GET /api/admin/users

**Purpose:** Get all users with pagination and search

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| per_page | integer | 15 | Results per page |
| search | string | "" | Search in name/email |
| page | integer | 1 | Page number |

**Caching:**
- Key: `admin:users:page:{page}:search:{md5(search)}`
- TTL: 300 seconds (5 minutes)

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "is_admin": false,
      "created_at": "2024-01-01T00:00:00Z",
      "uploaded_files_count": 25
    }
  ],
  "current_page": 1,
  "per_page": 15,
  "total": 156
}
```

**Features:**
- Case-insensitive search (ILIKE)
- Eager loads file count (`withCount('uploadedFiles')`)
- Ordered by created_at desc

---

### POST /api/admin/users

**Purpose:** Create new user (admin-initiated)

**Request Body:**
```json
{
  "name": "New User",
  "email": "newuser@example.com",
  "password": "password123",
  "is_admin": false
}
```

**Validation:**

| Field | Rules |
|-------|-------|
| name | required, string, max:255 |
| email | required, email, max:255, unique:users |
| password | required, string, min:8 |
| is_admin | boolean (default: false) |

**Behavior:**
- Hashes password
- Clears admin caches

**Response (201):**
```json
{
  "message": "User created successfully",
  "user": {...}
}
```

---

### PUT/PATCH /api/admin/users/{user}

**Purpose:** Update user

**Request Body:** (all fields optional)
```json
{
  "name": "Updated Name",
  "email": "newemail@example.com",
  "password": "newpassword123",
  "is_admin": true
}
```

**Validation:**
- Email unique check ignores current user
- Password hashed if provided

**Behavior:**
- Updates user fields
- Clears admin caches
- Returns fresh user data

**Response (200):**
```json
{
  "message": "User updated successfully",
  "user": {...}
}
```

---

### DELETE /api/admin/users/{user}

**Purpose:** Delete user

**Protection:** Cannot delete yourself

**Behavior:**
- Checks if user is deleting themselves
- Deletes user
- Clears admin caches

**Response (200):**
```json
{
  "message": "User deleted successfully"
}
```

**Error (403) - Self-Delete:**
```json
{
  "message": "You cannot delete your own account"
}
```

---

### GET /api/admin/files

**Purpose:** Get all files with filters

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| per_page | integer | Results per page (default: 15) |
| search | string | Search in filename/subject |
| subject | string | Filter by subject |
| category | string | Filter by category |
| user_id | integer | Filter by uploader |
| page | integer | Page number |

**Caching:**
- Key: `admin:files:page:{page}:{md5(filters)}`
- TTL: 300 seconds (5 minutes)

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "filename": "uuid.pdf",
      "original_filename": "lecture.pdf",
      "subject_name": "Programming",
      "category": "Materialy",
      "file_size": 1048576,
      "created_at": "2024-01-01T00:00:00Z",
      "user": {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  ],
  "current_page": 1,
  "per_page": 15,
  "total": 1250
}
```

---

### DELETE /api/admin/files/{file}

**Purpose:** Delete any file (admin override)

**Authorization:** Admin can delete any file (bypasses ownership check)

**Process:**
1. Deletes from storage
2. Removes from Elasticsearch
3. Deletes database record
4. Clears admin caches

**Response (200):**
```json
{
  "message": "File deleted successfully"
}
```

---

### GET /api/admin/stats

**Purpose:** Get admin dashboard statistics

**Caching:**
- Key: `admin:stats`
- TTL: 300 seconds (5 minutes)

**Response:**
```json
{
  "total_users": 156,
  "total_files": 1250,
  "total_subjects": 42,
  "total_storage": 2147483648,
  "recent_users": [
    {
      "id": 156,
      "name": "Latest User",
      "email": "latest@example.com",
      "created_at": "2024-01-10T00:00:00Z"
    }
  ],
  "recent_files": [
    {
      "id": 1250,
      "original_filename": "latest-file.pdf",
      "subject_name": "Math",
      "user_id": 50,
      "created_at": "2024-01-10T00:00:00Z",
      "file_size": 524288
    }
  ]
}
```

**Statistics:**
- Total counts (users, files, subjects)
- Total storage usage
- 5 most recent users
- 5 most recent files

---

## Performance Optimization

### Caching Strategy

**Cache Layers:**

| Layer | TTL | Purpose |
|-------|-----|---------|
| Redis cache | 5-30 min | Server-side caching |
| HTTP cache headers | 5 min | Client-side/CDN caching |
| Elasticsearch | Real-time | Fast aggregations |

**Cache Tags:**
- `['files']` - File listing caches
- `['subjects']` - Subject listing caches
- `['files', 'subjects']` - Cross-resource caches

**Cache Keys:**
- Include query parameters in hash
- User-specific: `favorites:user:{userId}`
- Resource-specific: `files:es:subject:{md5(name)}`

### Elasticsearch Usage

**When to Use ES:**
- Subject-only filtering (10-100x faster)
- Full-text search
- Statistics/aggregations
- Large dataset queries

**When to Use PostgreSQL:**
- Complex multi-filter queries
- Exact matches with joins
- Small datasets

### Response Optimization

**HTTP Cache Headers:**
```php
return response()->json($data)
    ->header('Cache-Control', 'public, max-age=300')
    ->header('X-Cache-Generated', now()->toIso8601String());
```

**Cache Control Types:**
- `public` - Cacheable by CDN/proxy
- `private` - User-specific, browser only
- `max-age` - Client cache duration (seconds)

---

## API Testing with curl

**Register:**
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123","password_confirmation":"password123"}'
```

**Login:**
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

**Authenticated Request:**
```bash
curl -X GET http://localhost:8000/api/subjects \
  -H "Authorization: Bearer 1|abc123..."
```

**Upload File:**
```bash
curl -X POST http://localhost:8000/api/files \
  -H "Authorization: Bearer 1|abc123..." \
  -F "file=@lecture.pdf" \
  -F "subject_name=Programming Basics" \
  -F "category=Materialy"
```

---

**Last Updated:** 2025-11-13
**Version:** 1.0
**Maintained By:** Development Team
