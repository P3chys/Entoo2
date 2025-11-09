# Troubleshooting Guide

## Issue: Users and Files Get Deleted After Container Restart

### Symptoms
- Users (especially IDs 28, 32-43) are missing from the database
- Download button returns 404 errors
- Database has 0 or very few records
- Elasticsearch still shows thousands of files
- Files exist in `storage/app/` but not in database

### Root Cause
The issue occurs when someone runs:
```bash
entoo.bat fresh
# OR
php artisan migrate:fresh --seed
```

This command:
1. **Drops all database tables** (including users and uploaded_files)
2. **Recreates empty tables** from migrations
3. **Seeds only 1 user** from DatabaseSeeder
4. **Leaves Elasticsearch index intact** with stale references
5. **Leaves physical files intact** in storage/app/

Result: Database is empty but Elasticsearch and storage have orphaned data.

### Solution

**Step 1: Restore database from Elasticsearch**
```bash
docker exec php php artisan sync:db-from-elasticsearch --user=28
```

This will:
- Fetch all 7,556 documents from Elasticsearch
- Recreate database records for each file
- Assign all files to user ID 28 (or specify different user)
- Skip files that already exist

**Step 2: Verify restoration**
```bash
# Check user exists
docker exec entoo_postgres psql -U entoo_user -d entoo -c "SELECT * FROM users;"

# Check files restored
docker exec entoo_postgres psql -U entoo_user -d entoo -c "SELECT COUNT(*) FROM uploaded_files;"

# Should show 7,556 files
```

### Prevention

1. **Updated DatabaseSeeder** now creates user ID 28 (Adam Pech) instead of test user
2. **Added confirmation prompt** to `entoo.bat fresh` command
3. **Shows reminder** to run sync command after fresh migration

### When to Use `migrate:fresh`

⚠️ **NEVER use in production!**

Only use `migrate:fresh --seed` when:
- Setting up a brand new development environment
- You intentionally want to wipe all data
- You have a backup or can restore from Elasticsearch

### Safe Database Operations

**Run new migrations** (safe):
```bash
docker exec php php artisan migrate
```

**Rollback last migration** (safe):
```bash
docker exec php php artisan migrate:rollback
```

**Check migration status** (safe):
```bash
docker exec php php artisan migrate:status
```

### Understanding Data Persistence

The PostgreSQL database is stored in Docker volume `entoo2_postgres_data`:
- Data persists across container restarts
- Data is NOT lost when you run `docker-compose down`
- Data IS lost when you run `docker-compose down -v` (removes volumes)
- Data IS lost when you run `migrate:fresh` (drops tables)

### Recovery Checklist

If you accidentally ran `migrate:fresh`:

- [ ] Don't panic! Elasticsearch and storage files are intact
- [ ] Run: `docker exec php php artisan migrate`
- [ ] Run: `docker exec php php artisan sync:db-from-elasticsearch --user=28`
- [ ] Verify: Check user and file counts in database
- [ ] Test: Try downloading a file from the dashboard
- [ ] Change password: Login as pechysadam@gmail.com with password "password" and change it

### Monitoring Database Health

```bash
# Check total users
docker exec entoo_postgres psql -U entoo_user -d entoo -c "SELECT COUNT(*) FROM users;"

# Check total files
docker exec entoo_postgres psql -U entoo_user -d entoo -c "SELECT COUNT(*) FROM uploaded_files;"

# Check Elasticsearch count
curl http://localhost:9200/entoo_documents/_count

# All three should match (7,556 files, at least 1 user)
```

### Related Files

- `webapp/database/seeders/DatabaseSeeder.php` - Creates user ID 28
- `webapp/app/Console/Commands/SyncDatabaseFromElasticsearch.php` - Sync command
- `entoo.bat` - Management script with confirmation prompt
- `docker-compose.yml` - PostgreSQL volume configuration
