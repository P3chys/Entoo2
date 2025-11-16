# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Entoo** is a Laravel 12 document management system designed for organizing and searching university course materials. The application uses Elasticsearch for full-text search, PostgreSQL for data persistence, Redis for caching, and Laravel Octane (Swoole) for high performance.

## Technology Stack

- **Backend**: Laravel 12 (PHP 8.2+) with Laravel Octane (Swoole)
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Search**: Elasticsearch 8.11 + Kibana
- **Frontend**: Vite 7 + Tailwind CSS 4 + Vanilla JavaScript
- **Infrastructure**: Docker Compose
- **Auth**: Laravel Sanctum

## Claude Code Workflow

**CRITICAL PRE-CONDITION:**
Before starting any new feature work, ALWAYS verify:
- ✅ All existing PRs are merged to main, OR
- ✅ There is a failing GitHub Action that needs fixing

**NEVER** start new feature work if:
- ❌ There are open/unmerged PRs waiting for review
- ❌ There are failing GitHub Actions that need attention
- ❌ Previous work is incomplete

Check status with: `gh pr list` and `gh run list --limit 5`

---

**IMPORTANT:** When implementing features or improvements, Claude Code should:

### 1. Automatic Testing - GUI and E2E
- **ALWAYS** create comprehensive GUI tests for any frontend/UI changes using Playwright
- **ALWAYS** run all tests and ensure they pass before committing
- Include both E2E tests and performance validation
- Test files go in `tests/tests/` directory

**GUI Testing Requirements:**

When implementing or modifying any GUI feature, you MUST:

1. **Create Playwright E2E tests** covering:
   - User interactions (clicks, inputs, navigation)
   - Form submissions and validations
   - Modal/dialog interactions
   - Search and filtering functionality
   - File uploads and downloads
   - Authentication flows
   - Favorites and user preferences
   - Error states and edge cases

2. **Use test helpers** from `tests/tests/helpers/`:
   - `auth.helper.ts` - Authentication setup and utilities
   - `api.helper.ts` - API interactions and data setup
   - `ui.helper.ts` - Common UI interactions

3. **Organize tests** by feature:
   - `tests/tests/gui/auth.spec.ts` - Authentication
   - `tests/tests/gui/favorites.spec.ts` - Favorites
   - `tests/tests/gui/file-upload.spec.ts` - File management
   - `tests/tests/gui/search.spec.ts` - Search functionality
   - `tests/tests/gui/subject-profile.spec.ts` - Subject profiles
   - `tests/tests/gui/dashboard.spec.ts` - Dashboard features

4. **Run tests in headless mode** (configured by default):
   ```bash
   cd tests
   npm test  # All tests
   npm test tests/gui/your-feature.spec.ts  # Specific test
   ```

5. **Verify test results** before committing:
   - All tests must pass (100% success rate)
   - No flaky tests (tests must be deterministic)
   - Performance benchmarks must meet targets

**Example GUI Test:**
```typescript
import { test, expect } from '@playwright/test';
import { setupAuth } from '../helpers/auth.helper';
import { toggleFavorite, isSubjectFavorite } from '../helpers/ui.helper';

test.describe('New Feature Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
  });

  test('should do something', async ({ page }) => {
    // Your test code
    await expect(page.locator('.element')).toBeVisible();
  });
});
```

See [tests/README.md](tests/README.md) for complete testing documentation.

### 2. Automatic Git Operations
- Create feature branches automatically: `feature/descriptive-name`
- Commit changes with detailed, multi-line commit messages
- Include performance metrics and test results in commits
- **ALWAYS** push branches to remote automatically: `git push -u origin <branch>`

### 3. Automatic PR Creation
- **ALWAYS** create Pull Requests automatically after pushing
- Use detailed PR descriptions with:
  - Summary of changes
  - Test results (all tests must pass)
  - Performance impact measurements
  - Before/After comparisons
  - Deployment notes
- Include co-authorship: `Co-Authored-By: Claude <noreply@anthropic.com>`

### 4. Documentation
- Update or create documentation for significant changes
- Include code examples and usage instructions
- Add performance benchmarks when relevant

### 5. Complete Workflow Example
```bash
# 1. Create branch
git checkout -b feature/add-caching

# 2. Implement feature with tests
# ... make changes ...
# ... create Playwright tests ...

# 3. Run tests
cd tests && npm test  # Must pass 100%

# 4. Commit with detailed message
git add -A
git commit -m "Add Redis caching with 80% performance improvement"

# 5. Push to remote
git push -u origin feature/add-caching

# 6. Create PR automatically
gh pr create --title "..." --body "..." --base main --head feature/add-caching
```

**DO NOT** ask for permission to push or create PRs - do it automatically as part of the workflow.

## Development Environment

### Starting the Application

**Production mode** (Nginx + PHP-FPM):
```bash
docker-compose up -d
```

**Development mode** (with hot reload and Octane watch):
```bash
dev-start.bat
# or
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

Development mode features:
- Opcache disabled for instant code changes
- Laravel Octane with --watch flag for hot reload
- All caches cleared on startup

### Management Commands

Use `entoo.bat` for common operations:
```bash
entoo.bat start          # Start containers
entoo.bat stop           # Stop containers
entoo.bat php            # Access PHP container shell
entoo.bat artisan <cmd>  # Run artisan commands
entoo.bat composer <cmd> # Run composer commands
entoo.bat migrate        # Run migrations
entoo.bat test           # Run PHPUnit tests
```

### Running Artisan Commands

Inside Docker:
```bash
docker exec -it php php artisan <command>
```

Or use the helper script:
```bash
entoo.bat artisan <command>
```

### Frontend Development

```bash
# Inside webapp directory
npm run dev    # Start Vite dev server
npm run build  # Build for production
```

### Testing

**Backend Tests (PHPUnit):**
```bash
docker exec -it php php artisan test
# or
entoo.bat test

# Run specific test
docker exec -it php php artisan test --filter=TestName
```

**Frontend/GUI Tests (Playwright E2E):**
```bash
cd tests

# Run all E2E tests (headless)
npm test

# Run specific test suite
npm test tests/gui/auth.spec.ts
npm test tests/gui/favorites.spec.ts

# Run with browser UI (headed mode)
npm run test:headed

# Debug mode
npm run test:debug

# View test report
npx playwright show-report
```

**IMPORTANT:** Always run GUI tests after making frontend changes. All tests must pass before committing.

## Architecture

### Directory Structure

- `webapp/` - Laravel application root
  - `app/Console/Commands/` - Custom artisan commands
  - `app/Http/Controllers/Api/` - API controllers
  - `app/Models/` - Eloquent models
  - `app/Services/` - Business logic services
  - `resources/views/` - Blade templates
  - `resources/js/` - Frontend JavaScript
  - `routes/` - Route definitions
- `docker/` - Docker configuration files
- `old_entoo/` - Legacy file import source (read-only mount)

### Core Services

**ElasticsearchService** (`app/Services/ElasticsearchService.php`)
- Manages document indexing and search
- Handles index creation with custom analyzers
- Configured at `services.elasticsearch` in config

**DocumentParserService** (`app/Services/DocumentParserService.php`)
- Extracts text from PDF, DOC, DOCX, PPT, PPTX, TXT files
- Used during file import and upload

### Data Models

- **User** - User accounts with authentication
- **UploadedFile** - Files uploaded to the system
  - Fields: `subject_name`, `category`, `file_extension`, `file_size`, `filepath`, `original_filename`
  - Categories: `Materialy`, `Otazky`, `Prednasky`, `Seminare`
- **FavoriteSubject** - User's favorite subjects
- **SubjectProfile** - Rich subject information (description, teachers, exams)

### API Architecture

All routes in `routes/api.php` follow this pattern:
- Public routes: Browse subjects, files, search (no auth required)
- Protected routes: Upload, delete, favorites (requires `auth:sanctum`)

Controllers are in `app/Http/Controllers/Api/`:
- `AuthController` - Registration, login, profile
- `SubjectController` - Subject browsing and categories
- `FileController` - File upload, download, delete
- `SearchController` - Elasticsearch-powered search
- `FavoriteController` - Favorite management
- `SubjectProfileController` - Subject profile CRUD

## Import System

### Elasticsearch Initialization

**Required before first use:**
```bash
docker exec -it php php artisan elasticsearch:init
```

This creates the index with proper mappings and analyzers.

### Importing Legacy Files

The import system reads files from `old_entoo/entoo_subjects/` with this structure:
```
entoo_subjects/
  {subject_name}/
    {category}/
      {files}
```

**Import all files:**
```bash
docker exec -it php php artisan import:existing-files
```

**Import with options:**
```bash
# Dry run (no changes)
docker exec -it php php artisan import:existing-files --dry-run

# Limit number of files
docker exec -it php php artisan import:existing-files --limit=100

# Specify source and user
docker exec -it php php artisan import:existing-files --source=/path/to/files --user=1
```

**Import behavior:**
- Parses document content and indexes in Elasticsearch
- Creates database records with original filepath
- Validates categories (Materialy, Otazky, Prednasky, Seminare)
- Supports: PDF, DOC, DOCX, PPT, PPTX, TXT
- Skips already imported files
- Continues on parsing errors (logs warning, indexes with empty content)

**Batch import helpers:**
- `import-batch.bat` - Import in batches
- `import-all-files.bat` - Import all files
- `monitor-import.bat` - Monitor import progress

## Database

### Migrations

```bash
docker exec -it php php artisan migrate
docker exec -it php php artisan migrate:fresh --seed  # Fresh start with seeds
```

### Key Tables

- `users` - User accounts
- `uploaded_files` - File metadata with performance indexes
- `favorite_subjects` - User favorites
- `subject_profiles` - Subject descriptions and metadata

## Docker Services

Access services at:
- **Application**: http://localhost:8000
- **API Documentation**: http://localhost:8000/api/documentation (Swagger UI)
- **Telescope**: http://localhost:8000/telescope (local only)
- **Elasticsearch**: http://localhost:9200
- **Kibana**: http://localhost:5601
- **Dozzle** (logs viewer): http://localhost:8888

## Development Tools

### Laravel Telescope

Telescope provides debugging and monitoring capabilities for your Laravel application.

**Access:** http://localhost:8000/telescope (only available in local environment)

**Features:**
- Request monitoring with timing and SQL queries
- Exception tracking
- Database query logging
- Redis command monitoring
- Cache operations tracking
- Job monitoring
- Mail preview
- Dump/log inspection

**Configuration:**
- Automatically enabled in local environment only
- Service provider: [app/Providers/TelescopeServiceProvider.php](webapp/app/Providers/TelescopeServiceProvider.php)
- Configuration: [config/telescope.php](webapp/config/telescope.php)
- Environment variable: `TELESCOPE_ENABLED` (optional override)

**Disabling in Development:**
If you need to temporarily disable Telescope:
```bash
# In .env file
TELESCOPE_ENABLED=false
```

### API Documentation (Swagger/OpenAPI)

Complete OpenAPI 3.0.0 documentation is generated for all API endpoints using L5-Swagger.

**Access:** http://localhost:8000/api/documentation (interactive Swagger UI)

**Features:**
- Complete API endpoint documentation with examples
- Request/response schemas with validation rules
- Try-it-out functionality for testing endpoints
- Authentication support (Bearer token)
- Organized by tags (Authentication, Files, Search, etc.)
- 28 documented endpoints across 8 controllers

**Exported Documentation:**
- **File**: [documentation/entoo-api-swagger.json](documentation/entoo-api-swagger.json)
- **Format**: OpenAPI 3.0.0 JSON (117 KB)
- **Use**: Import into Confluence, Postman, or other API tools

**Regenerate Documentation:**
```bash
# After adding/modifying OpenAPI annotations
docker exec php php artisan l5-swagger:generate

# Export to documentation folder
docker exec php cat storage/api-docs/api-docs.json > documentation/entoo-api-swagger.json
```

**Adding Documentation to New Endpoints:**
1. Add `use OpenApi\Attributes as OA;` to controller
2. Add OpenAPI attributes above controller methods:
```php
#[OA\Get(
    path: '/api/your-endpoint',
    summary: 'Brief description',
    description: 'Detailed description',
    security: [['sanctum' => []]],  // If authentication required
    tags: ['YourTag'],
    parameters: [
        new OA\Parameter(name: 'param', in: 'query', required: false,
            schema: new OA\Schema(type: 'string'), description: 'Param description'),
    ],
    responses: [
        new OA\Response(
            response: 200,
            description: 'Success response',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'data', type: 'array', items: new OA\Items(type: 'object')),
                ]
            )
        ),
        new OA\Response(response: 401, description: 'Unauthenticated'),
    ]
)]
public function yourMethod(Request $request)
```
3. Regenerate documentation with `php artisan l5-swagger:generate`

**Configuration:**
- Config file: [config/l5-swagger.php](webapp/config/l5-swagger.php)
- Base metadata: [app/Http/Controllers/Api/OpenApiController.php](webapp/app/Http/Controllers/Api/OpenApiController.php)

## Environment Configuration

Copy `.env.example` to `.env` in the `webapp/` directory. Key variables are overridden by docker-compose environment section:

```
DB_CONNECTION=pgsql
DB_HOST=postgres
REDIS_HOST=redis
ELASTICSEARCH_HOST=http://elasticsearch:9200
```

## Common Tasks

### Adding a New API Endpoint

1. Add route in `routes/api.php`
2. Create/modify controller in `app/Http/Controllers/Api/`
3. Add OpenAPI annotations (see API Documentation section for examples)
4. Update model if needed in `app/Models/`
5. Add validation using FormRequest if complex
6. Test with `php artisan test`
7. Regenerate API documentation: `php artisan l5-swagger:generate`

### Adding a New Artisan Command

1. Create: `php artisan make:command YourCommand`
2. Edit in `app/Console/Commands/`
3. Define signature and description
4. Implement `handle()` method
5. Test: `php artisan your:command`

### Modifying Frontend

1. Edit files in `resources/js/` or `resources/views/`
2. Frontend uses vanilla JavaScript with module pattern
3. Key files:
   - `dashboard.js` - Dashboard interactions
   - `subject-profile-modal.js` - Subject profile modal
   - `file-upload.js` - File upload functionality
4. Build: `npm run build` or use `npm run dev` for watch mode
5. **ALWAYS create/update GUI tests** in `tests/tests/gui/`
6. **Run tests** to verify changes: `cd tests && npm test`

### Adding Elasticsearch Fields

1. Modify `ElasticsearchService::createIndex()` mappings
2. Delete existing index (data loss!):
   ```bash
   curl -X DELETE http://localhost:9200/entoo_documents
   ```
3. Recreate: `php artisan elasticsearch:init`
4. Re-import data if needed

## Performance Notes

- Laravel Octane (Swoole) keeps application in memory - restart container after config changes
- Redis used for caching - clear with `php artisan cache:clear`
- Elasticsearch indexes are optimized with custom analyzers
- Database queries are optimized with indexes on `subject_name`, `category`, `user_id`

## Troubleshooting

**Container won't start:**
```bash
docker-compose down
docker-compose up -d --build
```

**Elasticsearch connection failed:**
```bash
# Wait for Elasticsearch to be ready (check healthcheck)
docker-compose ps

# Test connection
curl http://localhost:9200/_cluster/health
```

**Hot reload not working:**
Use development mode (`dev-start.bat`) which disables opcache and enables Octane watch mode.

**Import fails with memory errors:**
Increase PHP memory limit in `docker/php/php.ini` or use `--limit` option to process fewer files at once.
