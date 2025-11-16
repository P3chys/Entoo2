# Console Commands Reference

## Quick Reference

| Category | Commands | Purpose |
|----------|----------|---------|
| **Elasticsearch** | `elasticsearch:init`, `elasticsearch:reindex` | Index management and search functionality |
| **Data Migration** | `migrate:remaining-files` | Import legacy files from old system |
| **System Health** | `system:health-check`, `system:stats` | Monitor services and view statistics |
| **Cache Management** | `cache:clear-all`, `cache:warm-dashboard`, `cache:warm-stats` | Cache control and warming |
| **Optimization** | `system:optimize` | Production performance optimization |

---

## 1. Elasticsearch Commands

### Overview
Manage Elasticsearch index creation, configuration, and document indexing for full-text search functionality.

### elasticsearch:init

**Purpose:** Initialize Elasticsearch index with proper mappings and analyzers

**Usage:**
```bash
php artisan elasticsearch:init
```

**What it does:**
- Checks Elasticsearch connection
- Creates `entoo_documents` index with custom analyzers
- Configures field mappings for optimal search

**When to use:**
- First-time setup
- After deleting the index
- When changing index configuration

**Returns:**
- Exit code 0 on success
- Exit code 1 on failure

---

### elasticsearch:reindex

**Purpose:** Re-index all files from database into Elasticsearch

**Usage:**
```bash
# Full re-index with content parsing
php artisan elasticsearch:reindex

# Metadata only (skip content parsing)
php artisan elasticsearch:reindex --skip-content

# Custom batch size
php artisan elasticsearch:reindex --batch-size=50
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--skip-content` | flag | false | Skip re-parsing document content (faster) |
| `--batch-size` | int | 100 | Number of documents per batch |

**What it does:**
- Reads all files from PostgreSQL database
- Optionally extracts text content (PDF, DOC, DOCX, PPT, PPTX, TXT)
- Indexes documents with metadata and content
- Shows progress bar and statistics

**Indexed Fields:**
- `file_id`, `user_id`, `filename`, `original_filename`
- `filepath`, `subject_name`, `category`, `file_extension`, `file_size`
- `content` (extracted text), `created_at`, `updated_at`

**Performance Tips:**
> - Use `--skip-content` when only metadata changed
> - Adjust `--batch-size` based on available memory
> - Run during low-traffic periods
> - Parseable extensions: pdf, doc, docx, ppt, pptx, txt

---

## 2. Data Migration Commands

### migrate:remaining-files

**Purpose:** Import legacy files from old Entoo system into new database and Elasticsearch

**Usage:**
```bash
# Default migration
php artisan migrate:remaining-files

# Preview without changes
php artisan migrate:remaining-files --dry-run

# Custom source and limit
php artisan migrate:remaining-files --source=/path/to/files --user=2 --limit=100
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--source` | string | /old_entoo/entoo_subjects | Source directory path |
| `--user` | int | 1 | User ID to own migrated files |
| `--dry-run` | flag | false | Preview without making changes |
| `--limit` | int | null | Limit number of files to migrate |

**Expected Directory Structure:**
```
source/
  {subject_name}/
    {category}/
      {files}
```

**Valid Categories:**
- Materialy
- Otazky
- Prednasky
- Seminare

**What it does:**
1. Scans source directory using Unix `find` (handles special characters)
2. Validates path structure and category
3. Checks for duplicates (subject + filename + category)
4. Copies files to storage with unique filenames
5. Extracts text content for searchable files
6. Creates database records (transactional)
7. Indexes in Elasticsearch

**Storage Path Format:**
```
storage/app/uploads/{subject-slug}/{category-slug}/{unique-filename}
```

**Duplicate Detection:**
> Files are checked by: subject_name + original_filename + category
>
> Existing paths containing 'old_entoo' are excluded from duplicate checks

**Statistics Tracked:**
- Total files found
- Successfully migrated
- Skipped (already migrated)
- Skipped (invalid structure)
- Failed (with error details)

---

## 3. System Health & Monitoring

### Overview
Monitor system services, check connectivity, and view comprehensive statistics.

### system:health-check

**Purpose:** Verify all critical services are operational

**Usage:**
```bash
php artisan system:health-check
```

**Services Checked:**

| Service | Checks | Information Displayed |
|---------|--------|----------------------|
| PostgreSQL | Connection, query execution | Version |
| Redis | Ping, info retrieval | Version, memory usage |
| Elasticsearch | Ping, cluster info | Version, cluster name, index status |

**Output:**
- ✓ Success indicators
- ✗ Failure indicators
- ⚠ Warning indicators (e.g., missing index)

**Returns:**
- Exit code 0 if all services healthy
- Exit code 1 if any service unhealthy

**When to use:**
- After deployment
- Troubleshooting connectivity issues
- Health monitoring in scripts

---

### system:stats

**Purpose:** Display comprehensive system statistics

**Usage:**
```bash
php artisan system:stats
```

**Statistics Displayed:**

| Category | Metrics |
|----------|---------|
| **Database** | Total users, files, subjects, favorites |
| **Files by Category** | Count per category (Materialy, Otazky, etc.) |
| **File Extensions** | Top 10 extensions by count |
| **Storage** | Total size, average file size (formatted) |
| **Top Subjects** | Top 10 subjects by file count |
| **Elasticsearch** | Index status, document count, index size |

**Output Format:**
- Human-readable byte sizes (B, KB, MB, GB, TB)
- Organized sections with headers
- Sorted results (categories by count, subjects by popularity)

---

## 4. Cache Management

### Overview
Redis cache control and performance optimization through cache warming.

### Common Cache Operations

| Command | Purpose | Cache TTL |
|---------|---------|-----------|
| `cache:clear-all` | Clear all caches | N/A |
| `cache:warm-dashboard` | Warm dashboard caches | 30 minutes |
| `cache:warm-stats` | Warm stats cache | 30 minutes |

---

### cache:clear-all

**Purpose:** Clear application caches for troubleshooting or deployment

**Usage:**
```bash
# Clear all cache types
php artisan cache:clear-all

# Clear specific type
php artisan cache:clear-all --type=redis
php artisan cache:clear-all --type=config
php artisan cache:clear-all --type=route
php artisan cache:clear-all --type=view
```

**Cache Types:**

| Type | What Gets Cleared | Command Used |
|------|-------------------|--------------|
| `redis` | Entire Redis database | `Redis::flushdb()` |
| `config` | Cached configuration | `config:clear` |
| `route` | Cached routes | `route:clear` |
| `view` | Compiled Blade templates | `view:clear` |
| `all` | All of the above + Laravel cache | Multiple commands |

**When to use:**
- After configuration changes
- After route changes
- When debugging cache issues
- Before re-optimization

---

### cache:warm-dashboard

**Purpose:** Pre-load dashboard data for optimal initial page load performance

**Usage:**
```bash
php artisan cache:warm-dashboard
```

**Caches Warmed:**

| Cache Key | Data | TTL |
|-----------|------|-----|
| `system:stats:comprehensive` | Files, subjects, users, storage, categories, extensions | 30 min |
| `subjects:with_counts` | All subjects with file counts and profile status | 30 min |

**Process:**
1. Forgets existing cache entries
2. Regenerates from Elasticsearch (fast aggregations)
3. Measures and displays timing
4. Shows sample statistics

**Output:**
- Timing for each cache operation (milliseconds)
- Sample data (file counts, subject counts)
- Total elapsed time
- Cache expiration time

**When to use:**
- After deployment
- After data imports
- After re-indexing
- Schedule in cron: `*/30 * * * *`

---

### cache:warm-stats

**Purpose:** Pre-load system statistics for API performance

**Usage:**
```bash
php artisan cache:warm-stats
```

**Cache Details:**
- **Key:** `system:stats:comprehensive`
- **TTL:** 1800 seconds (30 minutes)
- **Source:** Elasticsearch aggregations + User count

**Data Cached:**
- Total files, subjects, users
- Total storage (bytes)
- Files by category breakdown
- Files by extension breakdown
- Top subjects
- Cached timestamp

**Output:**
- Execution time (milliseconds)
- Summary statistics
- Cache expiration time

---

## 5. System Optimization

### system:optimize

**Purpose:** Optimize application for production performance

**Usage:**
```bash
# Optimize with existing caches
php artisan system:optimize

# Clear then optimize
php artisan system:optimize --clear
```

**Options:**

| Option | Description |
|--------|-------------|
| `--clear` | Clear all caches before optimizing |

**Optimization Steps:**

| Step | Artisan Command | Effect |
|------|----------------|--------|
| 1. Clear caches (if --clear) | `cache:clear-all` | Removes all cached data |
| 2. Cache configuration | `config:cache` | Compiles config into single file |
| 3. Cache routes | `route:cache` | Compiles routes for faster routing |
| 4. Cache views | `view:cache` | Pre-compiles all Blade templates |
| 5. General optimization | `optimize` | Laravel optimization tasks |

**Important Notes:**

> **⚠️ Laravel Octane Users:** Always restart the server after optimization!
> ```bash
> docker-compose restart php
> ```

**When to use:**
- Before production deployment
- After configuration changes
- After route changes
- After view changes

**When NOT to use:**
- In development (disables hot reload)
- When actively developing

---

## Common Workflows

### Initial Setup Workflow
```bash
# 1. Initialize Elasticsearch
php artisan elasticsearch:init

# 2. Migrate legacy files
php artisan migrate:remaining-files --dry-run  # Preview first
php artisan migrate:remaining-files            # Execute migration

# 3. Warm caches
php artisan cache:warm-dashboard

# 4. Verify health
php artisan system:health-check

# 5. View statistics
php artisan system:stats
```

### Deployment Workflow
```bash
# 1. Clear caches
php artisan cache:clear-all

# 2. Optimize
php artisan system:optimize

# 3. Restart Octane (if using)
docker-compose restart php

# 4. Warm caches
php artisan cache:warm-dashboard

# 5. Health check
php artisan system:health-check
```

### Maintenance Workflow
```bash
# 1. Re-index documents (if needed)
php artisan elasticsearch:reindex --skip-content

# 2. Clear caches
php artisan cache:clear-all --type=redis

# 3. Warm caches
php artisan cache:warm-stats

# 4. Check system stats
php artisan system:stats
```

### Troubleshooting Workflow
```bash
# 1. Check service health
php artisan system:health-check

# 2. Clear all caches
php artisan cache:clear-all

# 3. Re-initialize Elasticsearch (if needed)
curl -X DELETE http://localhost:9200/entoo_documents
php artisan elasticsearch:init

# 4. Re-index documents
php artisan elasticsearch:reindex
```

---

## Performance Best Practices

### Cache Warming

**Schedule regular warming:**
```bash
# In crontab
*/30 * * * * php artisan cache:warm-stats
0 */6 * * * php artisan cache:warm-dashboard
```

Warm after: deployments, migrations, re-indexing

### Re-indexing

- Use `--skip-content` for faster metadata-only re-indexing
- Adjust `--batch-size` based on available memory:
  - Low memory: `--batch-size=50`
  - High memory: `--batch-size=200`
- Run during low-traffic periods
- Monitor memory usage

### Migration

- Always test with `--dry-run` first
- Use `--limit` for large datasets (process in chunks)
- Monitor disk space before large migrations
- Check duplicate detection is working

### Optimization

- Run `system:optimize` only in production
- Always restart Laravel Octane after optimization
- Clear caches in development to see code changes
- Schedule optimization in deployment scripts

---

## Error Handling & Exit Codes

### Exit Codes

| Code | Meaning | Commands |
|------|---------|----------|
| 0 | Success | All commands |
| 1 | Failure | All commands |
| `Command::SUCCESS` | Success (Laravel constant) | Warm commands |
| `Command::FAILURE` | Failure (Laravel constant) | Warm commands |

### Error Handling Patterns

**Elasticsearch Commands:**
- Connection errors: Clear error messages, exit 1
- Index exists: Informational, continue (exit 0)
- Parsing errors: Log warning, continue with empty content

**Migration Command:**
- Parsing errors: Non-fatal, logged but continue
- Copy errors: Fatal, rollback transaction, cleanup
- Database errors: Rollback, cleanup copied files
- Elasticsearch errors: Non-fatal, continue

**Cache Commands:**
- Redis errors: Display error, continue with other caches
- Individual cache failures: Non-fatal, show error

**Health Check:**
- Any service failure: Mark unhealthy, exit 1
- All services healthy: Exit 0

---

## Scheduling Recommendations

```bash
# /etc/crontab or Laravel scheduler

# Warm stats cache every 30 minutes
*/30 * * * * php artisan cache:warm-stats

# Warm dashboard cache every 6 hours
0 */6 * * * php artisan cache:warm-dashboard

# Daily health check at 2 AM
0 2 * * * php artisan system:health-check

# Weekly full re-index (Sunday 3 AM)
0 3 * * 0 php artisan elasticsearch:reindex --skip-content

# Daily optimization at 1 AM (production only)
0 1 * * * php artisan system:optimize
```

---

## Technical Details

### Common Dependencies

| Dependency | Used By | Purpose |
|------------|---------|---------|
| `ElasticsearchService` | 6 commands | Search and indexing operations |
| `DocumentParserService` | 2 commands | Text extraction from documents |
| `DB` facade | 3 commands | Database queries and transactions |
| `Redis` facade | 2 commands | Cache operations |
| `Cache` facade | 2 commands | Cache warming |
| `Artisan` facade | 2 commands | Calling other artisan commands |

### Configuration

**Elasticsearch Configuration**

File: `config/services.php`

```php
'elasticsearch' => [
    'host' => env('ELASTICSEARCH_HOST', 'http://elasticsearch:9200'),
    'index' => env('ELASTICSEARCH_INDEX', 'entoo_documents'),
],
```

**Environment Variables:**
- `ELASTICSEARCH_HOST` - Elasticsearch connection URL
- `ELASTICSEARCH_INDEX` - Index name (default: entoo_documents)

---

## Troubleshooting Common Issues

### Issue: "Elasticsearch connection failed"

**Check:**
```bash
docker-compose ps
```
Ensure Elasticsearch is running

**Test:**
```bash
curl http://localhost:9200/_cluster/health
```

**Fix:** Wait for Elasticsearch to be ready (check healthcheck)

---

### Issue: "Index already exists"

**Info:** This is normal, command will skip creation

**To recreate:**
```bash
curl -X DELETE http://localhost:9200/entoo_documents
```

---

### Issue: "Memory limit exceeded during parsing"

**Solution:**
- Use `--batch-size=50` or smaller
- Increase PHP memory limit in `docker/php/php.ini`

---

### Issue: "Hot reload not working after optimization"

**Solution:**
- Clear caches: `php artisan cache:clear-all`
- **Better:** Use dev mode (`dev-start.bat`) which disables optimization

---

### Issue: "Changes not reflected after code update"

**Solution:**
- Restart Laravel Octane: `docker-compose restart php`
- Clear caches: `php artisan cache:clear-all`

---

**Last Updated:** 2025-11-13
**Version:** 1.0
**Maintained By:** Development Team
