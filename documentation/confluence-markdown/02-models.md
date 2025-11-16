# Eloquent Models Documentation

## Overview

The Entoo application uses 4 core Eloquent models for data persistence and relationships.

| Model | Purpose | Key Features |
|-------|---------|--------------|
| **User** | User accounts and authentication | Admin access, API tokens, file ownership |
| **UploadedFile** | File metadata and storage | File processing, size formatting, Elasticsearch sync |
| **FavoriteSubject** | User's favorite subjects | Simple pivot for user preferences |
| **SubjectProfile** | Rich subject information | Descriptions, professors, course details |

---

## 1. User Model

**File:** `webapp/app/Models/User.php`

**Extends:** `Illuminate\Foundation\Auth\Authenticatable`

**Implements:** `FilamentUser` (for admin panel access)

### Purpose
Manages user authentication, authorization, and relationships with uploaded files.

### Traits Used

| Trait | Purpose |
|-------|---------|
| `HasFactory` | Factory support for testing and seeding |
| `Notifiable` | Email/notification support |
| `HasApiTokens` | Laravel Sanctum API authentication |

### Database Table

**Table Name:** `users`

**Fillable Attributes:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | User's display name |
| `email` | string | Email address (unique) |
| `password` | string | Hashed password |
| `is_admin` | boolean | Admin flag for panel access |

**Hidden Attributes:**
- `password` - Never exposed in JSON
- `remember_token` - Session token for "remember me"

**Casts:**

| Field | Cast Type | Purpose |
|-------|-----------|---------|
| `email_verified_at` | datetime | Carbon instance for verification timestamp |
| `password` | hashed | Automatic hashing on assignment |
| `is_admin` | boolean | Boolean conversion |

### Methods

#### canAccessPanel(Panel $panel): bool

**Purpose:** Determine if user can access Filament admin panel

**Parameters:**
- `$panel` (Panel) - Filament panel instance

**Returns:** `true` if user is admin, `false` otherwise

**Usage:**
```php
if ($user->canAccessPanel($adminPanel)) {
    // Grant access to admin features
}
```

**Access Control:**
- Only users with `is_admin = true` can access admin panel
- Used by Filament for authorization

---

#### uploadedFiles()

**Purpose:** Get all files uploaded by this user

**Returns:** HasMany relationship

**Relationship:** One-to-Many with `UploadedFile`

**Usage:**
```php
// Get user's files
$files = $user->uploadedFiles;

// Count files
$count = $user->uploadedFiles()->count();

// Filter files
$pdfFiles = $user->uploadedFiles()
    ->where('file_extension', 'pdf')
    ->get();
```

### Authentication

**API Authentication:** Laravel Sanctum
- Token-based authentication for API endpoints
- Tokens stored in `personal_access_tokens` table

**Session Authentication:** Standard Laravel Auth
- Cookie-based for web routes
- "Remember me" functionality supported

### Admin Access

**Filament Admin Panel:**
- URL: `/admin`
- Access controlled by `is_admin` field
- Interface for user and file management

---

## 2. UploadedFile Model

**File:** `webapp/app/Models/UploadedFile.php`

**Extends:** `Illuminate\Database\Eloquent\Model`

### Purpose
Stores metadata about uploaded files and maintains sync with Elasticsearch for search functionality.

### Database Table

**Table Name:** `uploaded_files`

**Fillable Attributes:**

| Field | Type | Description |
|-------|------|-------------|
| `user_id` | integer | Foreign key to users table |
| `filename` | string | Unique storage filename (slugified + unique ID) |
| `original_filename` | string | Original filename from upload |
| `filepath` | string | Full storage path relative to storage/app |
| `subject_name` | string | Subject/course name |
| `category` | string | Category (Materialy, Otazky, Prednasky, Seminare) |
| `file_size` | integer | File size in bytes |
| `file_extension` | string | File extension (lowercase) |
| `processing_status` | string | Processing state (pending, processing, completed, failed) |
| `processing_error` | string | Error message if processing failed |
| `processed_at` | datetime | Timestamp when processing completed |

**Casts:**

| Field | Cast Type |
|-------|-----------|
| `user_id` | integer |
| `file_size` | integer |
| `processed_at` | datetime |

### Valid Categories

> The system enforces these 4 categories:
> - **Materialy** - Course materials, textbooks, resources
> - **Otazky** - Questions, quizzes, exams
> - **Prednasky** - Lectures, presentations
> - **Seminare** - Seminars, workshops

### Processing Status Flow

```
pending → processing → completed
                    ↘ failed
```

| Status | Description |
|--------|-------------|
| `pending` | File uploaded, awaiting processing |
| `processing` | Currently extracting text/indexing |
| `completed` | Successfully processed and indexed |
| `failed` | Processing failed, see processing_error |

### Relationships

#### user()

**Purpose:** Get the user who uploaded this file

**Returns:** BelongsTo relationship

**Usage:**
```php
$file = UploadedFile::find(1);
$uploaderName = $file->user->name;
```

### Accessors

#### getFormattedFileSizeAttribute(): string

**Purpose:** Format file size in human-readable format

**Returns:** String like "1.25 MB", "500 KB", "2.5 GB"

**Algorithm:**
1. Starts with bytes
2. Divides by 1024 until < 1024
3. Rounds to 2 decimal places
4. Appends unit (B, KB, MB, GB)

**Usage:**
```php
$file = UploadedFile::find(1);
echo $file->formatted_file_size; // "2.45 MB"
```

**Units:** B (bytes), KB (kilobytes), MB (megabytes), GB (gigabytes)

### Storage Path Structure

Files are stored with this pattern:
```
storage/app/uploads/{subject-slug}/{category-slug}/{filename}
```

**Example:**
```
storage/app/uploads/zaklady-programovania/materialy/lecture-notes_abc123def.pdf
```

**Filename Format:**
```
{slugified-original-name}_{unique-id}.{extension}
```

### Database Indexes

**Performance Optimization:**

| Index | Columns | Purpose |
|-------|---------|---------|
| `idx_subject_name` | subject_name | Fast subject filtering |
| `idx_category` | category | Fast category filtering |
| `idx_user_id` | user_id | Fast user file lookup |
| `idx_created_at` | created_at | Chronological sorting |

### Elasticsearch Sync

**Indexed Fields:**
- All metadata fields (filename, subject, category, etc.)
- Extracted text content (for searchable files)
- Timestamps

**Sync Operations:**
- **Create:** Indexed after processing completes
- **Update:** Re-indexed if metadata changes
- **Delete:** Removed from index when file deleted

**Searchable Extensions:**
- pdf, doc, docx, ppt, pptx, txt

---

## 3. FavoriteSubject Model

**File:** `webapp/app/Models/FavoriteSubject.php`

**Extends:** `Illuminate\Database\Eloquent\Model`

### Purpose
Tracks which subjects each user has marked as favorite for quick access.

### Database Table

**Table Name:** `favorite_subjects`

**Fillable Attributes:**

| Field | Type | Description |
|-------|------|-------------|
| `user_id` | integer | Foreign key to users table |
| `subject_name` | string | Name of favorited subject |

**Casts:**

| Field | Cast Type |
|-------|-----------|
| `user_id` | integer |

**Unique Constraint:** `(user_id, subject_name)` - Prevents duplicate favorites

### Relationships

#### user()

**Purpose:** Get the user who favorited this subject

**Returns:** BelongsTo relationship

**Usage:**
```php
$favorite = FavoriteSubject::find(1);
$user = $favorite->user;
```

### Common Queries

**Get User's Favorites:**
```php
$favorites = FavoriteSubject::where('user_id', $userId)
    ->pluck('subject_name');
```

**Check if Favorited:**
```php
$isFavorite = FavoriteSubject::where('user_id', $userId)
    ->where('subject_name', $subjectName)
    ->exists();
```

**Add Favorite:**
```php
FavoriteSubject::create([
    'user_id' => $userId,
    'subject_name' => $subjectName
]);
```

**Remove Favorite:**
```php
FavoriteSubject::where('user_id', $userId)
    ->where('subject_name', $subjectName)
    ->delete();
```

**Toggle Favorite:**
```php
$exists = FavoriteSubject::where('user_id', $userId)
    ->where('subject_name', $subjectName)
    ->exists();

if ($exists) {
    FavoriteSubject::where('user_id', $userId)
        ->where('subject_name', $subjectName)
        ->delete();
} else {
    FavoriteSubject::create([
        'user_id' => $userId,
        'subject_name' => $subjectName
    ]);
}
```

### API Integration

**Endpoints:**
- `POST /api/favorites` - Add favorite
- `DELETE /api/favorites/{subject}` - Remove favorite
- `GET /api/favorites` - List user's favorites

---

## 4. SubjectProfile Model

**File:** `webapp/app/Models/SubjectProfile.php`

**Extends:** `Illuminate\Database\Eloquent\Model`

### Purpose
Stores rich information about subjects/courses including descriptions, professors, course codes, and scheduling details.

### Database Table

**Table Name:** `subject_profiles`

**Fillable Attributes:**

| Field | Type | Description |
|-------|------|-------------|
| `subject_name` | string | Subject name (unique) |
| `description` | text | Course description/overview |
| `professor_name` | string | Professor/instructor name |
| `course_code` | string | Course code (e.g., "CS101") |
| `semester` | string | Semester offered (e.g., "Winter", "Summer") |
| `year` | integer | Academic year |
| `notes` | text | Additional notes/information |
| `color` | string | UI color theme (hex code) |
| `credits` | integer | Course credit hours |
| `created_by` | integer | User ID who created profile |
| `updated_by` | integer | User ID who last updated profile |

**Casts:**

| Field | Cast Type |
|-------|-----------|
| `year` | integer |
| `credits` | integer |

**Appended Attributes:**
- `file_count` - Automatically included in JSON serialization

### Relationships

#### creator()

**Purpose:** Get the user who created this profile

**Returns:** BelongsTo relationship to User model

**Foreign Key:** `created_by`

**Usage:**
```php
$profile = SubjectProfile::find(1);
$creatorName = $profile->creator->name;
```

---

#### updater()

**Purpose:** Get the user who last updated this profile

**Returns:** BelongsTo relationship to User model

**Foreign Key:** `updated_by`

**Usage:**
```php
$profile = SubjectProfile::find(1);
$updaterName = $profile->updater->name;
```

---

#### uploadedFiles()

**Purpose:** Get all files associated with this subject

**Returns:** HasMany relationship to UploadedFile

**Key Matching:** `subject_name` (both models)

> **Note:** Uses string matching, not integer foreign key

**Usage:**
```php
$profile = SubjectProfile::where('subject_name', 'Programming Basics')->first();
$files = $profile->uploadedFiles;
```

### Accessors

#### getFileCountAttribute(): int

**Purpose:** Get number of files for this subject

**Returns:** Integer count

**Optimization:** Uses cached count from `withCount()` if available

**Algorithm:**
1. Checks if `uploaded_files_count` exists in attributes (from `withCount()`)
2. If yes, returns cached count (fast, no query)
3. If no, executes count query (slower, causes N+1 if in loop)

**Efficient Usage (with eager loading):**
```php
$profiles = SubjectProfile::withCount('uploadedFiles')->get();
foreach ($profiles as $profile) {
    echo $profile->file_count; // Uses cached count, no extra queries
}
```

**⚠️ Inefficient Usage (N+1 problem):**
```php
$profiles = SubjectProfile::all();
foreach ($profiles as $profile) {
    echo $profile->file_count; // Executes count query for each profile!
}
```

**JSON Serialization:**
```json
{
  "subject_name": "Programming Basics",
  "description": "Introduction to programming...",
  "file_count": 42
}
```

### Color Theme

**Purpose:** UI customization for subject cards/badges

**Format:** Hex color code (e.g., `#3B82F6`, `#10B981`)

**Usage in Frontend:**
```javascript
const subjectCard = document.createElement('div');
subjectCard.style.borderColor = profile.color;
```

**Default Colors (suggested):**
- Blue: `#3B82F6`
- Green: `#10B981`
- Purple: `#8B5CF6`
- Red: `#EF4444`
- Yellow: `#F59E0B`

### Audit Trail

**Created By:**
- Set when profile is first created
- References user who created the profile
- Immutable after creation

**Updated By:**
- Updated each time profile is modified
- References user who made the last change
- Used for tracking changes

**Timestamps:**
- `created_at` - Automatic Laravel timestamp
- `updated_at` - Automatic Laravel timestamp

### Common Queries

**Get Profile by Subject Name:**
```php
$profile = SubjectProfile::where('subject_name', 'Programming Basics')->first();
```

**Get Profiles with File Counts:**
```php
$profiles = SubjectProfile::withCount('uploadedFiles')
    ->orderBy('uploaded_files_count', 'desc')
    ->get();
```

**Get Profiles by Professor:**
```php
$profiles = SubjectProfile::where('professor_name', 'like', '%Smith%')->get();
```

**Get Profiles by Semester:**
```php
$profiles = SubjectProfile::where('semester', 'Winter')
    ->where('year', 2024)
    ->get();
```

**Create Profile with Audit:**
```php
SubjectProfile::create([
    'subject_name' => 'Advanced Algorithms',
    'description' => 'Study of complex algorithms...',
    'professor_name' => 'Dr. Smith',
    'created_by' => auth()->id(),
    'updated_by' => auth()->id(),
]);
```

**Update Profile with Audit:**
```php
$profile->update([
    'description' => 'Updated description...',
    'updated_by' => auth()->id(),
]);
```

---

## Model Relationships Diagram

```
User (1) ──────< (M) UploadedFile
 │
 │ (1) ──────< (M) FavoriteSubject
 │
 │ (1) ──────< (M) SubjectProfile (creator)
 │
 └─ (1) ──────< (M) SubjectProfile (updater)

SubjectProfile (1) ──────< (M) UploadedFile
                          (via subject_name)
```

### Relationship Details

| Parent | Child | Type | Foreign Key | Description |
|--------|-------|------|-------------|-------------|
| User | UploadedFile | One-to-Many | user_id | Files uploaded by user |
| User | FavoriteSubject | One-to-Many | user_id | User's favorite subjects |
| User | SubjectProfile | One-to-Many | created_by | Profiles created by user |
| User | SubjectProfile | One-to-Many | updated_by | Profiles updated by user |
| SubjectProfile | UploadedFile | One-to-Many | subject_name | Files for subject |

---

## Performance Best Practices

### Eager Loading

**❌ Problem: N+1 Query Problem**
```php
// BAD: Executes 1 + N queries
$files = UploadedFile::all();
foreach ($files as $file) {
    echo $file->user->name; // Query for each file!
}
```

**✅ Solution: Eager Load Relationships**
```php
// GOOD: Executes 2 queries total
$files = UploadedFile::with('user')->get();
foreach ($files as $file) {
    echo $file->user->name; // No query, loaded from memory
}
```

### Counting Relationships

**❌ Problem: N+1 on Counts**
```php
// BAD: Executes count query for each profile
$profiles = SubjectProfile::all();
foreach ($profiles as $profile) {
    echo $profile->file_count; // Count query for each!
}
```

**✅ Solution: Use withCount()**
```php
// GOOD: Single query with subquery
$profiles = SubjectProfile::withCount('uploadedFiles')->get();
foreach ($profiles as $profile) {
    echo $profile->file_count; // Uses cached count
}
```

### Index Usage

**Ensure Queries Use Indexes:**

```php
// Uses idx_subject_name index
UploadedFile::where('subject_name', 'Programming')->get();

// Uses idx_category index
UploadedFile::where('category', 'Materialy')->get();

// Uses idx_user_id index
UploadedFile::where('user_id', 123)->get();

// Uses idx_created_at index for sorting
UploadedFile::orderBy('created_at', 'desc')->get();
```

### Pagination

**Large Result Sets:**
```php
// Instead of get(), use paginate()
$files = UploadedFile::paginate(50); // 50 per page

// For API responses
$files = UploadedFile::simplePaginate(20); // Simpler, faster
```

### Select Specific Columns

**Reduce Memory Usage:**
```php
// Instead of selecting all columns
$files = UploadedFile::select(['id', 'filename', 'file_size'])->get();
```

---

## Common Query Patterns

### Files by Subject and Category
```php
$files = UploadedFile::where('subject_name', 'Programming Basics')
    ->where('category', 'Materialy')
    ->orderBy('created_at', 'desc')
    ->get();
```

### User's Files with Formatting
```php
$files = UploadedFile::where('user_id', $userId)
    ->select(['id', 'filename', 'original_filename', 'file_size', 'created_at'])
    ->get()
    ->map(function($file) {
        return [
            'id' => $file->id,
            'name' => $file->original_filename,
            'size' => $file->formatted_file_size,
            'uploaded' => $file->created_at->diffForHumans(),
        ];
    });
```

### Subjects with File Counts and Favorites
```php
$userId = auth()->id();
$subjects = SubjectProfile::withCount('uploadedFiles')
    ->get()
    ->map(function($profile) use ($userId) {
        return [
            'name' => $profile->subject_name,
            'description' => $profile->description,
            'file_count' => $profile->file_count,
            'is_favorite' => FavoriteSubject::where('user_id', $userId)
                ->where('subject_name', $profile->subject_name)
                ->exists(),
        ];
    });
```

### Recent Files Across All Subjects
```php
$recentFiles = UploadedFile::with('user')
    ->where('processing_status', 'completed')
    ->orderBy('created_at', 'desc')
    ->limit(20)
    ->get();
```

---

## Validation Rules

### User Model
```
'name' => 'required|string|max:255',
'email' => 'required|string|email|max:255|unique:users',
'password' => 'required|string|min:8|confirmed',
'is_admin' => 'boolean',
```

### UploadedFile Model
```
'subject_name' => 'required|string|max:255',
'category' => 'required|in:Materialy,Otazky,Prednasky,Seminare',
'file_extension' => 'required|string|max:10',
'file_size' => 'required|integer|min:0',
```

### FavoriteSubject Model
```
'user_id' => 'required|exists:users,id',
'subject_name' => 'required|string|max:255',
```

### SubjectProfile Model
```
'subject_name' => 'required|string|max:255|unique:subject_profiles',
'description' => 'nullable|string',
'professor_name' => 'nullable|string|max:255',
'course_code' => 'nullable|string|max:50',
'semester' => 'nullable|string|max:50',
'year' => 'nullable|integer|min:2000|max:2100',
'credits' => 'nullable|integer|min:0|max:20',
'color' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
```

---

## Security Considerations

### Mass Assignment Protection

**Fillable Arrays:**
- Only specified fields can be mass-assigned
- Prevents injection of unintended fields

**Example Attack Prevention:**
```php
// Attacker tries to set is_admin
User::create($request->all()); // is_admin ignored (not fillable)
```

### Hidden Attributes

**Never Expose:**
- User passwords (hashed or not)
- Remember tokens
- API tokens (unless explicitly needed)

### Authorization

**Policy Checks:**
- File deletion: Only owner or admin
- Profile editing: Authenticated users only
- Admin panel: Only `is_admin` users

---

## Related Documentation

- [API Controllers](03-api-controllers.md) - Endpoints using these models
- [Console Commands](01-console-commands.md) - Batch operations
- Services Documentation - ElasticsearchService sync

---

**Last Updated:** 2025-11-13
**Version:** 1.0
**Maintained By:** Development Team
