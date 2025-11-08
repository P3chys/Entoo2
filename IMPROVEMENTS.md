# ENTOO2 - Future Improvements Roadmap

Last Updated: 2025-11-08

This document outlines potential improvements and enhancements for the Entoo2 document management system, categorized by priority and area of impact.

## Table of Contents
1. [High Priority](#high-priority)
2. [Medium Priority](#medium-priority)
3. [Low Priority](#low-priority)
4. [Implementation Phases](#implementation-phases)

---

## HIGH PRIORITY

### Security Improvements

#### 1. Complete Password Reset Implementation
**Status:** CRITICAL
**Category:** Security
**Impact:** HIGH

**Issue:**
Password reset endpoints (`forgotPassword`, `resetPassword`) in [AuthController.php](webapp/app/Http/Controllers/Api/AuthController.php) are incomplete with TODO comments. No actual token generation or validation exists.

**Solution:**
- Implement Laravel's built-in password reset functionality with `Password` facade
- Add token generation and secure storage
- Send password reset emails with secure links
- Implement token expiration (15-60 minutes)
- Add rate limiting on reset requests

**Estimated Effort:** 4-6 hours

---

#### 2. Add Rate Limiting to Authentication Endpoints
**Status:** HIGH
**Category:** Security
**Impact:** HIGH

**Issue:**
No rate limiting on authentication endpoints (login, register, password reset), making the system vulnerable to brute force attacks.

**Solution:**
```php
// In routes/api.php
Route::post('/login', [AuthController::class, 'login'])
    ->middleware('throttle:5,1');
Route::post('/register', [AuthController::class, 'register'])
    ->middleware('throttle:3,1');
Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])
    ->middleware('throttle:3,10');
```

**Estimated Effort:** 1-2 hours

---

#### 3. Implement File Download Authorization
**Status:** MEDIUM
**Category:** Security
**Impact:** MEDIUM

**Issue:**
File download endpoint ([FileController::download](webapp/app/Http/Controllers/Api/FileController.php)) doesn't verify authorization. Any authenticated user can download any file.

**Solution:**
- Add authorization policy to verify file ownership or admin role
- Implement `FilePolicy` with `download` method
- Add middleware to check permissions before download

**Estimated Effort:** 3-4 hours

---

#### 4. Sanitize User Input in Frontend
**Status:** MEDIUM
**Category:** Security (XSS Prevention)
**Impact:** MEDIUM

**Issue:**
Multiple instances of `innerHTML` usage without proper sanitization in [dashboard.js](webapp/resources/js/dashboard.js:239-260, 425-448).

**Solution:**
- Use DOMPurify library for HTML sanitization
- Replace `innerHTML` with `textContent` for user-generated content
- Create utility function for safe HTML rendering

**Estimated Effort:** 2-3 hours

---

### Performance Improvements

#### 5. Fix Queue Configuration Default
**Status:** CRITICAL
**Category:** Performance/Configuration
**Impact:** HIGH

**Issue:**
[config/queue.php:16](webapp/config/queue.php#L16) defaults to `database` but infrastructure uses `redis`. Mismatch could cause queue failures.

**Solution:**
- Change default from `database` to `redis` in config
- Verify `.env` sets `QUEUE_CONNECTION=redis`
- Document queue configuration

**Estimated Effort:** 1 hour

---

#### 6. Fix Cache Driver Default
**Status:** CRITICAL
**Category:** Performance
**Impact:** HIGH

**Issue:**
[config/cache.php:18](webapp/config/cache.php#L18) defaults to `database` but Redis is available and much faster for tagged caching.

**Solution:**
- Change default from `database` to `redis`
- Ensure cache tags work correctly
- Update documentation

**Estimated Effort:** 1 hour

---

#### 7. Add Database Indexes
**Status:** HIGH
**Category:** Performance
**Impact:** HIGH

**Issue:**
Missing indexes on frequently queried fields will cause performance degradation as data grows:
- `uploaded_files.subject_name`
- `uploaded_files.category`
- `favorite_subjects.subject_name`

**Solution:**
```php
// Create migration: add_performance_indexes
Schema::table('uploaded_files', function (Blueprint $table) {
    $table->index('subject_name');
    $table->index('category');
    $table->index(['subject_name', 'category']);
});

Schema::table('favorite_subjects', function (Blueprint $table) {
    $table->index('subject_name');
    $table->index(['user_id', 'subject_name']);
});
```

**Estimated Effort:** 2-3 hours

---

#### 8. Fix N+1 Query Problem
**Status:** HIGH
**Category:** Performance
**Impact:** HIGH

**Issue:**
[SubjectProfile::getFileCountAttribute](webapp/app/Models/SubjectProfile.php:47-50) triggers N+1 queries when loading multiple profiles.

**Solution:**
- Use `withCount('uploadedFiles')` for eager loading
- Cache file counts with Redis
- Add database trigger to maintain count

**Estimated Effort:** 3-4 hours

---

### Testing Improvements

#### 9. Add Comprehensive Backend Unit Tests
**Status:** CRITICAL
**Category:** Testing
**Impact:** HIGH

**Issue:**
Only GUI tests exist. No PHPUnit tests for backend logic makes changes risky.

**Solution:**
- Add PHPUnit feature tests for all controllers
- Add unit tests for services (ElasticsearchService, DocumentParserService)
- Add tests for artisan commands
- Add model unit tests
- Target: 80%+ code coverage

**Estimated Effort:** 20-30 hours

---

### Infrastructure Improvements

#### 10. Implement Backup Strategy
**Status:** HIGH
**Category:** Infrastructure
**Impact:** CRITICAL

**Issue:**
No automated backups for database, Elasticsearch, or uploaded files creates data loss risk.

**Solution:**
- Set up automated PostgreSQL dumps (daily)
- Configure Elasticsearch snapshot repository
- Backup uploaded files to offsite storage (S3/Backblaze)
- Create restore testing procedure
- Document backup/restore process

**Estimated Effort:** 10-15 hours

---

## MEDIUM PRIORITY

### Code Quality Improvements

#### 11. Extract Cache Clearing Logic to Service
**Status:** MEDIUM
**Category:** Code Quality
**Impact:** MEDIUM

**Issue:**
Cache clearing logic duplicated in [FileController](webapp/app/Http/Controllers/Api/FileController.php) and [ProcessUploadedFile](webapp/app/Jobs/ProcessUploadedFile.php).

**Solution:**
```php
// Create app/Services/CacheService.php
class CacheService {
    public function clearFileRelatedCaches(): void {
        Cache::tags(['files', 'subjects', 'stats'])->flush();
    }
}
```

**Estimated Effort:** 2-3 hours

---

#### 12. Replace Magic Strings with Enums
**Status:** MEDIUM
**Category:** Code Quality
**Impact:** MEDIUM

**Issue:**
Categories hardcoded as strings ('Materialy', 'Otazky', 'Prednasky', 'Seminare') in 15+ locations.

**Solution:**
```php
// Create app/Enums/FileCategory.php
enum FileCategory: string {
    case Materialy = 'Materialy';
    case Otazky = 'Otazky';
    case Prednasky = 'Prednasky';
    case Seminare = 'Seminare';

    public static function values(): array {
        return array_column(self::cases(), 'value');
    }
}
```

**Estimated Effort:** 3-4 hours

---

#### 13. Create Form Request Classes
**Status:** MEDIUM
**Category:** Code Quality
**Impact:** MEDIUM

**Issue:**
Validation logic embedded in controllers instead of dedicated FormRequest classes.

**Solution:**
- Create `StoreFileRequest`
- Create `StoreSubjectProfileRequest`
- Create `UpdateSubjectProfileRequest`
- Move validation rules from controllers

**Estimated Effort:** 4-6 hours

---

#### 14. Standardize Error Handling
**Status:** MEDIUM
**Category:** Code Quality
**Impact:** MEDIUM

**Issue:**
Mix of exception throwing vs. returning error responses in controllers.

**Solution:**
- Use Laravel's exception handler consistently
- Create custom exception classes for business logic
- Standardize API error response format
- Add exception mapping to HTTP status codes

**Estimated Effort:** 6-8 hours

---

#### 15. Introduce Data Transfer Objects (DTOs)
**Status:** LOW-MEDIUM
**Category:** Code Quality
**Impact:** MEDIUM

**Issue:**
Passing arrays between services and controllers. ElasticsearchService returns untyped arrays.

**Solution:**
```php
// Create app/DTOs/
- SearchResultDTO
- FileDTO
- SubjectDTO
```

**Estimated Effort:** 8-10 hours

---

### Architecture Improvements

#### 16. Implement Repository Pattern
**Status:** MEDIUM
**Category:** Architecture
**Impact:** MEDIUM

**Issue:**
Controllers directly use Eloquent models, making testing harder and coupling tight.

**Solution:**
```php
// Create app/Repositories/
interface FileRepositoryInterface {
    public function findById(int $id): ?UploadedFile;
    public function findBySubject(string $subject): Collection;
    public function create(array $data): UploadedFile;
}

class EloquentFileRepository implements FileRepositoryInterface {
    // Implementation
}
```

**Estimated Effort:** 15-20 hours

---

#### 17. Split Large Service Classes
**Status:** MEDIUM
**Category:** Architecture
**Impact:** MEDIUM

**Issue:**
[ElasticsearchService](webapp/app/Services/ElasticsearchService.php) has 569 lines and too many responsibilities.

**Solution:**
Split into:
- `ElasticsearchIndexService` - Index management
- `ElasticsearchSearchService` - Search operations
- `ElasticsearchDocumentService` - CRUD operations

**Estimated Effort:** 10-12 hours

---

#### 18. Implement Event System
**Status:** MEDIUM
**Category:** Architecture
**Impact:** MEDIUM

**Issue:**
File upload/delete triggers manual cache clearing. Not extensible.

**Solution:**
```php
// Create events
- FileUploaded
- FileDeleted
- FileUpdated

// Create listeners
- ClearFileCache
- UpdateStatistics
- SendNotification (future)
```

**Estimated Effort:** 6-8 hours

---

#### 19. Add API Versioning
**Status:** LOW
**Category:** Architecture
**Impact:** MEDIUM

**Issue:**
API routes at `/api/*` with no versioning. Breaking changes would break frontend.

**Solution:**
- Move routes to `/api/v1/*`
- Add version negotiation header support
- Plan migration strategy for future versions

**Estimated Effort:** 4-6 hours

---

### Feature Enhancements

#### 20. Implement File Versioning
**Status:** MEDIUM
**Category:** Features
**Impact:** MEDIUM

**Issue:**
Uploading same filename overwrites previous version with no history.

**Solution:**
- Add `file_versions` table
- Track version history
- Allow rollback to previous versions
- Display version history in UI

**Estimated Effort:** 15-20 hours

---

#### 21. Add File Sharing
**Status:** MEDIUM
**Category:** Features
**Impact:** MEDIUM

**Solution:**
- Share files with specific users
- Generate public links with expiration
- Permission levels (view only, download)
- Track share access

**Estimated Effort:** 20-25 hours

---

#### 22. Implement Bulk Operations
**Status:** MEDIUM
**Category:** Features
**Impact:** MEDIUM

**Solution:**
- Bulk delete files
- Bulk download (ZIP)
- Bulk move between categories
- Bulk tag management

**Estimated Effort:** 12-15 hours

---

#### 23. Add File Preview
**Status:** MEDIUM
**Category:** Features
**Impact:** MEDIUM

**Solution:**
- PDF preview using PDF.js
- Image preview in modal
- Text file preview
- Document metadata display

**Estimated Effort:** 10-12 hours

---

#### 24. Create Admin Panel
**Status:** MEDIUM
**Category:** Features
**Impact:** MEDIUM

**Solution:**
Use Laravel Filament or Nova for:
- User management
- System statistics dashboard
- File management
- Elasticsearch health monitoring
- Cache management

**Estimated Effort:** 30-40 hours

---

### Testing Improvements

#### 25. Add Database Seeders
**Status:** MEDIUM
**Category:** Testing/DX
**Impact:** MEDIUM

**Solution:**
- Create realistic test data seeders
- Add factory definitions for all models
- Quick dev environment setup
- Consistent test data

**Estimated Effort:** 6-8 hours

---

#### 26. Add API Integration Tests
**Status:** MEDIUM
**Category:** Testing
**Impact:** MEDIUM

**Solution:**
- Test all API endpoints
- Verify authentication/authorization
- Test error responses
- Validate response structures

**Estimated Effort:** 15-20 hours

---

#### 27. Add Edge Case Tests
**Status:** MEDIUM
**Category:** Testing
**Impact:** MEDIUM

**Solution:**
- Upload timeout handling
- Network disconnection during download
- Invalid file types
- File size limit enforcement
- Concurrent operation handling

**Estimated Effort:** 10-12 hours

---

### Infrastructure Improvements

#### 28. Add Application Monitoring
**Status:** MEDIUM
**Category:** Infrastructure
**Impact:** MEDIUM

**Solution:**
- Laravel Horizon for queue monitoring
- Sentry for error tracking
- Prometheus + Grafana for metrics
- Uptime monitoring (UptimeRobot)

**Estimated Effort:** 15-20 hours

---

#### 29. Enhance Health Check Endpoint
**Status:** MEDIUM
**Category:** Infrastructure
**Impact:** MEDIUM

**Issue:**
[/api/health](webapp/routes/api.php) endpoint exists but doesn't check all dependencies.

**Solution:**
```php
// Check:
- PostgreSQL connectivity
- Redis connectivity
- Elasticsearch health
- Queue worker status
- Disk space
- Cache functionality
```

**Estimated Effort:** 4-6 hours

---

### Documentation

#### 30. Generate API Documentation
**Status:** MEDIUM
**Category:** Documentation
**Impact:** MEDIUM

**Solution:**
- Add Scribe or L5-Swagger package
- Document all API endpoints
- Include request/response examples
- Add authentication docs
- Host at `/api/documentation`

**Estimated Effort:** 8-12 hours

---

## LOW PRIORITY

### Developer Experience

#### 31. Update .env.example
**Status:** LOW
**Category:** Documentation
**Impact:** LOW

**Solution:**
- Ensure `.env.example` is complete
- Document all variables
- Add comments explaining each variable
- Include example values

**Estimated Effort:** 1-2 hours

---

#### 32. Add Development Tools
**Status:** LOW
**Category:** DX
**Impact:** LOW

**Solution:**
- Add Laravel Telescope for debugging
- Add Laravel Debugbar for development
- Configure for dev environment only

**Estimated Effort:** 3-4 hours

---

#### 33. Implement Git Hooks
**Status:** LOW
**Category:** DX
**Impact:** LOW

**Solution:**
Use GrumPHP or similar:
- PHPStan static analysis
- PHP CS Fixer
- Run tests before commit
- Prevent commits to main

**Estimated Effort:** 4-6 hours

---

### Feature Enhancements

#### 34. Add Advanced Search Filters
**Status:** LOW
**Category:** Features
**Impact:** LOW

**Solution:**
- Filter by date range
- Filter by file size
- Filter by uploader
- Filter by file type
- Save search queries

**Estimated Effort:** 10-15 hours

---

#### 35. Implement Notifications
**Status:** LOW-MEDIUM
**Category:** Features
**Impact:** MEDIUM

**Solution:**
- Email notifications for file processing
- Browser notifications
- Notification preferences
- Notification history

**Estimated Effort:** 12-15 hours

---

### UI/UX Improvements

#### 36. Add Loading States
**Status:** LOW
**Category:** UX
**Impact:** LOW

**Solution:**
- Loading skeletons for all async operations
- Progress indicators
- Optimistic UI updates
- Better perceived performance

**Estimated Effort:** 6-8 hours

---

#### 37. Implement Keyboard Shortcuts
**Status:** LOW
**Category:** UX
**Impact:** LOW

**Solution:**
- `/` to focus search
- `Esc` to close modals
- `n` for new upload
- Arrow keys for navigation
- `?` to show shortcuts help

**Estimated Effort:** 4-6 hours

---

#### 38. Add Drag and Drop Upload
**Status:** MEDIUM
**Category:** UX
**Impact:** MEDIUM

**Solution:**
- Drag and drop zone for file uploads
- Multiple file upload
- Upload progress for each file
- Visual feedback

**Estimated Effort:** 8-10 hours

---

#### 39. Implement Virtual Scrolling
**Status:** LOW
**Category:** UX/Performance
**Impact:** LOW

**Solution:**
- Virtual scrolling for large subject lists
- Lazy loading of file lists
- Pagination improvements

**Estimated Effort:** 10-12 hours

---

#### 40. Add Dark Mode Persistence
**Status:** LOW
**Category:** UX
**Impact:** LOW

**Solution:**
- Add localStorage persistence for theme
- Respect system preference
- Smooth theme transitions

**Estimated Effort:** 2-3 hours

---

#### 41. Add Breadcrumb Navigation
**Status:** LOW
**Category:** UX
**Impact:** LOW

**Solution:**
- Breadcrumbs for deep navigation
- Subject → Category → File hierarchy
- Click to navigate back

**Estimated Effort:** 4-6 hours

---

#### 42. Add Upload Progress Percentage
**Status:** LOW
**Category:** UX
**Impact:** LOW

**Solution:**
- Use XMLHttpRequest.upload.onprogress
- Show real-time upload progress
- Cancel upload option

**Estimated Effort:** 3-4 hours

---

#### 43. Improve Mobile Responsiveness
**Status:** MEDIUM
**Category:** UX
**Impact:** MEDIUM

**Solution:**
- Test and improve mobile UX
- Optimize modals for small screens
- Touch-friendly controls
- Responsive tables

**Estimated Effort:** 12-15 hours

---

### Data Management

#### 44. Implement Soft Deletes
**Status:** MEDIUM
**Category:** Data
**Impact:** MEDIUM

**Solution:**
- Add soft deletes to UploadedFile model
- Trash/restore functionality
- Permanent delete option
- Auto-cleanup after 30 days

**Estimated Effort:** 6-8 hours

---

#### 45. Extract and Store File Metadata
**Status:** LOW
**Category:** Features
**Impact:** LOW

**Issue:**
[DocumentParserService::getMetadata](webapp/app/Services/DocumentParserService.php) exists but is never used.

**Solution:**
- Store author, title, page count
- Display metadata in UI
- Make metadata searchable

**Estimated Effort:** 6-8 hours

---

#### 46. Implement Data Export (GDPR)
**Status:** MEDIUM
**Category:** Data/Compliance
**Impact:** MEDIUM

**Solution:**
- Export user's data (CSV/JSON)
- Include files and metadata
- GDPR compliance
- Data portability

**Estimated Effort:** 8-10 hours

---

#### 47. Add Analytics Tracking
**Status:** LOW
**Category:** Features
**Impact:** LOW

**Solution:**
- Track file downloads (anonymized)
- Popular subjects
- Search analytics
- User engagement metrics
- Privacy-respecting implementation

**Estimated Effort:** 10-15 hours

---

### Configuration

#### 48. Move Hardcoded Config to Files
**Status:** LOW
**Category:** Configuration
**Impact:** LOW

**Issue:**
File size limits, cache TTLs, supported extensions hardcoded.

**Solution:**
```php
// config/files.php
return [
    'max_size' => env('FILE_MAX_SIZE', 52428800), // 50MB
    'supported_extensions' => ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt'],
];

// config/cache.php
return [
    'ttl' => [
        'subjects' => 1800, // 30 minutes
        'files' => 300, // 5 minutes
        'stats' => 600, // 10 minutes
    ],
];
```

**Estimated Effort:** 3-4 hours

---

#### 49. Add Environment-Specific Configuration
**Status:** LOW
**Category:** Configuration
**Impact:** LOW

**Solution:**
- Document environment differences
- Use config files for env-specific settings
- Separate dev/staging/production configs

**Estimated Effort:** 2-3 hours

---

### Infrastructure

#### 50. Add CDN for Static Assets
**Status:** LOW
**Category:** Infrastructure
**Impact:** LOW

**Solution:**
- Configure CloudFlare or AWS CloudFront
- Serve static assets from CDN
- Optimize cache headers
- Reduce origin server load

**Estimated Effort:** 6-8 hours

---

#### 51. Implement High Availability
**Status:** LOW
**Category:** Infrastructure
**Impact:** CRITICAL (for production scale)

**Issue:**
Single Redis, Elasticsearch, PostgreSQL instances - no redundancy.

**Solution:**
- PostgreSQL streaming replication
- Redis Sentinel or cluster
- Elasticsearch cluster (3+ nodes)
- Load balancer for PHP containers

**Estimated Effort:** 40-60 hours

---

#### 52. Configure Log Rotation
**Status:** LOW
**Category:** Infrastructure
**Impact:** LOW

**Issue:**
No log rotation configured - logs will grow indefinitely.

**Solution:**
- Configure logrotate for Laravel logs
- Or use centralized logging (ELK Stack)
- Set retention policies

**Estimated Effort:** 3-4 hours

---

## Implementation Phases

### Phase 1: Critical Fixes (Weeks 1-2)
**Priority:** Immediate
- [ ] Complete password reset implementation (#1)
- [ ] Add rate limiting to auth endpoints (#2)
- [ ] Fix queue configuration default (#5)
- [ ] Fix cache driver default (#6)
- [ ] Add file download authorization (#3)

**Estimated Total:** 15-20 hours

---

### Phase 2: Performance & Testing (Weeks 3-4)
**Priority:** High
- [ ] Add database indexes (#7)
- [ ] Fix N+1 query problems (#8)
- [ ] Add comprehensive backend tests (#9)
- [ ] Implement backup strategy (#10)

**Estimated Total:** 35-50 hours

---

### Phase 3: Code Quality & Architecture (Weeks 5-8)
**Priority:** Medium
- [ ] Implement repository pattern (#16)
- [ ] Extract magic strings to enums (#12)
- [ ] Split large service classes (#17)
- [ ] Create Form Request classes (#13)
- [ ] Implement event system (#18)

**Estimated Total:** 40-50 hours

---

### Phase 4: Features & UX (Weeks 9-16)
**Priority:** Medium-Low
- [ ] Add file versioning (#20)
- [ ] Implement file sharing (#21)
- [ ] Add file preview (#23)
- [ ] Create admin panel (#24)
- [ ] Implement bulk operations (#22)
- [ ] Improve mobile responsiveness (#43)

**Estimated Total:** 100-130 hours

---

### Phase 5: Monitoring & Infrastructure (Ongoing)
**Priority:** Medium
- [ ] Add application monitoring (#28)
- [ ] Enhance health check endpoint (#29)
- [ ] Generate API documentation (#30)
- [ ] Implement soft deletes (#44)

**Estimated Total:** 40-50 hours

---

## Summary by Category

| Category | High Priority | Medium Priority | Low Priority | Total |
|----------|--------------|-----------------|--------------|-------|
| Security | 4 | 0 | 0 | 4 |
| Performance | 4 | 0 | 0 | 4 |
| Code Quality | 0 | 5 | 0 | 5 |
| Testing | 1 | 3 | 0 | 4 |
| Architecture | 0 | 4 | 0 | 4 |
| Features | 0 | 5 | 2 | 7 |
| Infrastructure | 1 | 2 | 3 | 6 |
| UX | 0 | 2 | 7 | 9 |
| Data | 0 | 2 | 2 | 4 |
| Configuration | 0 | 0 | 2 | 2 |
| Documentation | 0 | 1 | 1 | 2 |
| **TOTAL** | **10** | **24** | **17** | **51** |

---

## Contributing

When implementing improvements:
1. Create a feature branch: `feature/improvement-{number}`
2. Reference this document in commit messages
3. Update this file when improvements are completed
4. Add tests for all new functionality
5. Update relevant documentation

---

## Notes

- Estimates are approximate and may vary based on complexity
- Some improvements may unlock or enable others
- Security and performance items should be prioritized
- Consider business value when prioritizing medium/low items
- Regular review and re-prioritization recommended

---

**Document Maintained By:** Development Team
**Last Review:** 2025-11-08
