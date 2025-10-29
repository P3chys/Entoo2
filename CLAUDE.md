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

**IMPORTANT:** When implementing features or improvements, Claude Code should:

### 1. Automatic Testing
- **ALWAYS** create comprehensive tests for each feature using Playwright
- Run all tests and ensure they pass before committing
- Include both E2E tests and performance validation
- Test files go in `tests/tests/` directory

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

```bash
docker exec -it php php artisan test
# or
entoo.bat test

# Run specific test
docker exec -it php php artisan test --filter=TestName
```

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
- **Elasticsearch**: http://localhost:9200
- **Kibana**: http://localhost:5601
- **Dozzle** (logs viewer): http://localhost:8888

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
3. Update model if needed in `app/Models/`
4. Add validation using FormRequest if complex
5. Test with `php artisan test`

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
4. Build: `npm run build` or use `npm run dev` for watch mode

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
