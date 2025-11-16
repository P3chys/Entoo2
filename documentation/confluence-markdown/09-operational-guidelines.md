# Operational Guidelines and Procedures

## Quick Reference

| Operation Type | Frequency | Commands/Actions |
|---------------|-----------|------------------|
| **Deployment** | On release | Build, migrate, optimize, restart |
| **Backups** | Daily | Database dump, file sync, ES snapshot |
| **Monitoring** | Continuous | Logs, health checks, metrics |
| **Cache Warming** | Every 30 min | Warm stats, warm dashboard |
| **Re-indexing** | Weekly | Elasticsearch reindex |
| **Security Updates** | Monthly | Dependencies, Docker images |
| **Performance Tuning** | As needed | Optimize queries, cache, indexes |

---

## 1. Daily Operations

### Morning Checks (5 minutes)

**Purpose:** Ensure system is healthy and running smoothly

**Procedure:**
```bash
# 1. Check service health
docker-compose ps

# 2. Check application health
curl http://localhost:8000/api/health

# 3. Quick log scan
docker-compose logs --tail=100 php | grep -i error
docker-compose logs --tail=100 queue | grep -i error

# 4. Check queue status
docker exec php php artisan queue:failed

# 5. Check disk space
df -h
```

**Expected Results:**
- All services: `Up (healthy)`
- Health check: `{"status":"healthy"}`
- No critical errors in logs
- No failed queue jobs (or investigate if any)
- Disk space >20% available

**If Issues Found:** See [Incident Response](#incident-response)

---

### Cache Warming (Automated)

**Purpose:** Keep frequently accessed data in cache

**Schedule:** Every 30 minutes (via cron or Laravel scheduler)

**Commands:**
```bash
# Warm statistics cache
php artisan cache:warm-stats

# Warm dashboard cache
php artisan cache:warm-dashboard
```

**Cron Configuration:**
```bash
# /etc/crontab or Laravel scheduler
*/30 * * * * php artisan cache:warm-stats
0 */6 * * * php artisan cache:warm-dashboard
```

**Laravel Scheduler (Recommended):**
```php
// app/Console/Kernel.php
protected function schedule(Schedule $schedule): void
{
    $schedule->command('cache:warm-stats')->everyThirtyMinutes();
    $schedule->command('cache:warm-dashboard')->everySixHours();
}
```

---

## 2. Deployment Procedures

### Standard Deployment (10-15 minutes)

**When:** New features, bug fixes, updates

**Pre-Deployment Checklist:**
- [ ] All tests pass locally
- [ ] Code reviewed and approved
- [ ] Database migrations tested
- [ ] Backup completed
- [ ] Deployment scheduled (low-traffic time)
- [ ] Team notified

**Step-by-Step Procedure:**

```bash
# 1. Pull latest code
cd /path/to/entoo
git pull origin main

# 2. Update dependencies
docker exec php composer install --no-dev --optimize-autoloader

# 3. Run database migrations
docker exec php php artisan migrate --force

# 4. Clear all caches
docker exec php php artisan cache:clear-all

# 5. Optimize application
docker exec php php artisan system:optimize

# 6. Restart PHP container (Octane)
docker-compose restart php

# 7. Restart queue worker
docker-compose restart queue

# 8. Warm caches
docker exec php php artisan cache:warm-dashboard

# 9. Verify deployment
curl http://localhost:8000/api/health

# 10. Check logs for errors
docker-compose logs --tail=50 php
```

**Post-Deployment Verification:**
```bash
# Test critical endpoints
curl http://localhost:8000/api/subjects
curl http://localhost:8000/api/files
curl http://localhost:8000/api/health

# Check service health
docker-compose ps

# Monitor logs for 5 minutes
docker-compose logs -f php
```

**Rollback Procedure (if needed):**
```bash
# 1. Restore previous version
git checkout <previous-commit>

# 2. Rollback migrations (if needed)
docker exec php php artisan migrate:rollback

# 3. Restart services
docker-compose restart php queue

# 4. Verify rollback
curl http://localhost:8000/api/health
```

---

### Database Migration Deployment

**When:** Schema changes required

**Extra Precautions:**
```bash
# 1. Backup database BEFORE migration
docker exec entoo_postgres pg_dump -U entoo_user entoo > backup_pre_migration_$(date +%Y%m%d_%H%M%S).sql

# 2. Test migration on copy of production data (staging)
docker exec php php artisan migrate --pretend

# 3. Run migration
docker exec php php artisan migrate --force

# 4. Verify migration
docker exec php php artisan migrate:status

# 5. If issues, rollback immediately
docker exec php php artisan migrate:rollback --step=1
```

---

### Elasticsearch Re-indexing Deployment

**When:** Search index structure changes

**Procedure:**
```bash
# 1. Delete old index
curl -X DELETE http://localhost:9200/entoo_documents

# 2. Create new index with updated mappings
docker exec php php artisan elasticsearch:init

# 3. Re-index all documents (can take time!)
docker exec php php artisan elasticsearch:reindex --batch-size=100

# 4. Verify index
curl http://localhost:9200/entoo_documents/_count

# 5. Test search
curl "http://localhost:8000/api/search?q=test"
```

**Estimated Time:**
- 1,000 files: ~5 minutes
- 10,000 files: ~30 minutes
- 100,000 files: ~3 hours

**Tip:** Use `--skip-content` for faster re-indexing if only metadata changed

---

## 3. Backup Procedures

### Daily Automated Backups

**What to Backup:**
1. PostgreSQL database
2. Uploaded files (storage/app/uploads)
3. Elasticsearch indexes (optional)
4. Configuration files (.env, docker-compose.yml)

---

#### PostgreSQL Backup Script

**File:** `/opt/backups/backup-postgres.sh`

```bash
#!/bin/bash
set -e

# Configuration
BACKUP_DIR="/opt/backups/postgres"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/entoo_$TIMESTAMP.sql.gz"

# Create backup
echo "Starting PostgreSQL backup..."
docker exec entoo_postgres pg_dump -U entoo_user entoo | gzip > "$BACKUP_FILE"

# Verify backup
if [ -f "$BACKUP_FILE" ]; then
    SIZE=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE")
    echo "Backup completed: $BACKUP_FILE ($SIZE bytes)"
else
    echo "ERROR: Backup failed!"
    exit 1
fi

# Delete old backups
find $BACKUP_DIR -name "entoo_*.sql.gz" -mtime +$RETENTION_DAYS -delete
echo "Old backups cleaned (kept last $RETENTION_DAYS days)"

# Optional: Upload to S3/cloud storage
# aws s3 cp "$BACKUP_FILE" s3://your-bucket/backups/
```

**Cron Schedule:**
```bash
# Daily at 2 AM
0 2 * * * /opt/backups/backup-postgres.sh >> /var/log/backup-postgres.log 2>&1
```

---

#### File Storage Backup Script

**File:** `/opt/backups/backup-files.sh`

```bash
#!/bin/bash
set -e

# Configuration
SOURCE_DIR="/path/to/entoo/storage/app/uploads"
BACKUP_DIR="/opt/backups/files"
TIMESTAMP=$(date +%Y%m%d)

# Rsync with incremental backup
echo "Starting file backup..."
rsync -av --delete \
    --link-dest="$BACKUP_DIR/latest" \
    "$SOURCE_DIR/" \
    "$BACKUP_DIR/$TIMESTAMP/"

# Update 'latest' symlink
rm -f "$BACKUP_DIR/latest"
ln -s "$BACKUP_DIR/$TIMESTAMP" "$BACKUP_DIR/latest"

echo "File backup completed: $BACKUP_DIR/$TIMESTAMP"

# Delete old backups (keep last 14 days)
find $BACKUP_DIR -maxdepth 1 -type d -mtime +14 -exec rm -rf {} \;
```

**Cron Schedule:**
```bash
# Daily at 3 AM
0 3 * * * /opt/backups/backup-files.sh >> /var/log/backup-files.log 2>&1
```

---

### Backup Restoration

#### Restore PostgreSQL

```bash
# 1. Stop application
docker-compose stop php nginx queue

# 2. Restore database
gunzip -c backups/postgres/entoo_20251113_020000.sql.gz | \
  docker exec -i entoo_postgres psql -U entoo_user -d entoo

# 3. Restart services
docker-compose start php nginx queue

# 4. Verify restoration
docker exec php php artisan tinker
>>> User::count()
>>> UploadedFile::count()
```

#### Restore Files

```bash
# 1. Stop application
docker-compose stop php nginx queue

# 2. Restore files
rsync -av /opt/backups/files/20251113/ /path/to/entoo/storage/app/uploads/

# 3. Fix permissions
docker exec php chown -R www-data:www-data storage/app/uploads

# 4. Restart services
docker-compose start php nginx queue
```

---

## 4. Monitoring and Alerts

### System Monitoring

**Health Check Endpoints:**
```bash
# Application health
curl http://localhost:8000/api/health
# Expected: {"status":"healthy","services":{...}}

# Elasticsearch health
curl http://localhost:9200/_cluster/health
# Expected: {"status":"green",...}

# Redis health
docker exec entoo_redis redis-cli -a redis_password ping
# Expected: PONG
```

---

### Log Monitoring

**Real-time Log Monitoring:**
```bash
# Monitor all containers
docker-compose logs -f

# Monitor specific service
docker-compose logs -f php
docker-compose logs -f queue
docker-compose logs -f nginx

# Monitor with Dozzle (Web UI)
# Open: http://localhost:8888
```

**Log Locations:**
- Application logs: `storage/logs/laravel.log`
- Nginx logs: Docker logs (stdout)
- Queue worker logs: Docker logs (stdout)

---

### Error Detection

**Check for Recent Errors:**
```bash
# PHP errors (last 1 hour)
docker-compose logs --since 1h php | grep -i "error\|exception\|fatal"

# Queue failures
docker exec php php artisan queue:failed

# Nginx errors
docker-compose logs --since 1h nginx | grep -i "error"
```

---

### Performance Metrics

**Database Performance:**
```bash
# Slow queries
docker exec entoo_postgres psql -U entoo_user -d entoo -c \
  "SELECT query, mean_exec_time, calls FROM pg_stat_statements
   ORDER BY mean_exec_time DESC LIMIT 10;"

# Connection count
docker exec entoo_postgres psql -U entoo_user -d entoo -c \
  "SELECT count(*) FROM pg_stat_activity;"
```

**Redis Performance:**
```bash
# Redis stats
docker exec entoo_redis redis-cli -a redis_password info stats

# Memory usage
docker exec entoo_redis redis-cli -a redis_password info memory
```

**Elasticsearch Performance:**
```bash
# Index stats
curl http://localhost:9200/entoo_documents/_stats

# Node stats
curl http://localhost:9200/_nodes/stats
```

---

## 5. Maintenance Tasks

### Weekly Maintenance (30 minutes)

**Schedule:** Sunday, 3 AM (low traffic)

**Tasks:**

```bash
# 1. Re-index Elasticsearch (metadata only)
docker exec php php artisan elasticsearch:reindex --skip-content

# 2. Clear old logs (keep last 7 days)
find storage/logs -name "*.log" -mtime +7 -delete

# 3. Optimize database
docker exec entoo_postgres psql -U entoo_user -d entoo -c "VACUUM ANALYZE;"

# 4. Check and clear failed queue jobs
docker exec php php artisan queue:failed
docker exec php php artisan queue:flush  # If appropriate

# 5. Update system stats
docker exec php php artisan system:stats

# 6. Verify backups
ls -lh /opt/backups/postgres/ | tail -7
ls -lh /opt/backups/files/ | tail -7
```

---

### Monthly Maintenance (1-2 hours)

**Schedule:** First Sunday of month, 2 AM

**Tasks:**

```bash
# 1. Update dependencies (security patches)
docker exec php composer update --no-dev

# 2. Update Docker images
docker-compose pull
docker-compose up -d --build

# 3. Full Elasticsearch re-index (with content)
docker exec php php artisan elasticsearch:reindex

# 4. Database optimization
docker exec entoo_postgres psql -U entoo_user -d entoo -c "REINDEX DATABASE entoo;"
docker exec entoo_postgres psql -U entoo_user -d entoo -c "VACUUM FULL ANALYZE;"

# 5. Check disk space and clean up
df -h
docker system prune -a --volumes  # ⚠️ Removes unused Docker data

# 6. Review and rotate logs
logrotate /etc/logrotate.d/entoo  # If configured

# 7. Security audit
docker exec php php artisan audit:security  # If package installed
```

---

### Quarterly Maintenance (2-4 hours)

**Tasks:**
- Review and update Laravel version
- Review and update PHP version
- Review and update PostgreSQL version
- Review and update Elasticsearch version
- Performance audit and optimization
- Security audit
- Capacity planning review
- Backup restoration test

---

## 6. Incident Response

### Critical Service Down

**Symptoms:** Application not responding, 502/503 errors

**Immediate Actions:**
```bash
# 1. Check service status
docker-compose ps

# 2. Check recent logs
docker-compose logs --tail=100 php
docker-compose logs --tail=100 nginx

# 3. Restart affected services
docker-compose restart php nginx

# 4. If still down, restart all services
docker-compose restart

# 5. Verify restoration
curl http://localhost:8000/api/health
```

**Escalation:** If issue persists >5 minutes, notify team lead

---

### Database Connection Issues

**Symptoms:** "SQLSTATE" errors, "could not connect" errors

**Actions:**
```bash
# 1. Check PostgreSQL status
docker-compose ps postgres

# 2. Check PostgreSQL logs
docker-compose logs --tail=100 postgres

# 3. Test connection
docker exec entoo_postgres psql -U entoo_user -d entoo -c "SELECT 1;"

# 4. Check connection count
docker exec entoo_postgres psql -U entoo_user -d entoo -c \
  "SELECT count(*) FROM pg_stat_activity;"

# 5. If too many connections, restart
docker-compose restart postgres

# 6. Wait for health check
docker-compose ps postgres  # Wait for (healthy)

# 7. Restart dependent services
docker-compose restart php queue
```

---

### Queue Processing Stopped

**Symptoms:** Files stuck in 'pending' status

**Actions:**
```bash
# 1. Check queue worker status
docker-compose ps queue

# 2. Check queue worker logs
docker-compose logs --tail=100 queue

# 3. Check for failed jobs
docker exec php php artisan queue:failed

# 4. Restart queue worker
docker-compose restart queue

# 5. Monitor queue processing
docker-compose logs -f queue

# 6. If jobs failing, investigate error
docker exec php php artisan queue:failed --format=json
```

---

### Elasticsearch Down

**Symptoms:** Search not working, "Connection refused" errors

**Actions:**
```bash
# 1. Check Elasticsearch status
docker-compose ps elasticsearch

# 2. Check Elasticsearch logs
docker-compose logs --tail=100 elasticsearch

# 3. Check cluster health
curl http://localhost:9200/_cluster/health

# 4. Common issue: Out of memory
# Increase heap size in docker-compose.yml
# ES_JAVA_OPTS=-Xms2g -Xmx2g

# 5. Restart Elasticsearch
docker-compose restart elasticsearch

# 6. Wait for health (takes 30-60 seconds)
watch -n 5 'curl -s http://localhost:9200/_cluster/health | jq .status'

# 7. If index missing, recreate
docker exec php php artisan elasticsearch:init
docker exec php php artisan elasticsearch:reindex
```

---

### Disk Space Full

**Symptoms:** "No space left on device" errors

**Actions:**
```bash
# 1. Check disk usage
df -h

# 2. Identify large directories
du -sh /path/to/entoo/* | sort -h

# 3. Clear logs
find storage/logs -name "*.log" -mtime +1 -delete

# 4. Clear old Docker data
docker system prune -a --volumes  # ⚠️ Careful

# 5. Clear Elasticsearch old indices (if any)
curl -X DELETE "http://localhost:9200/*-old"

# 6. Move old backups to external storage
mv /opt/backups/postgres/* /mnt/external/backups/

# 7. Verify space freed
df -h
```

---

## 7. Performance Tuning

### Slow Application Response

**Investigation:**
```bash
# 1. Check system resources
docker stats

# 2. Check slow database queries
docker exec entoo_postgres psql -U entoo_user -d entoo -c 
  \"SELECT query, mean_exec_time, calls
   FROM pg_stat_statements
   ORDER BY mean_exec_time DESC LIMIT 10;"

# 3. Check Elasticsearch performance
curl "http://localhost:9200/entoo_documents/_search?pretty" -d'
{
  "profile": true,
  "query": {"match_all": {}}
}'

# 4. Check cache hit rate
docker exec entoo_redis redis-cli -a redis_password info stats | grep hits

# 5. Enable query logging (temporarily)
# In .env: DB_LOG_QUERIES=true
```

**Optimization Actions:**
```bash
# 1. Warm caches
docker exec php php artisan cache:warm-dashboard
docker exec php php artisan cache:warm-stats

# 2. Optimize application
docker exec php php artisan system:optimize

# 3. Clear old cache entries
docker exec entoo_redis redis-cli -a redis_password FLUSHDB

# 4. Analyze and optimize database
docker exec entoo_postgres psql -U entoo_user -d entoo -c "VACUUM ANALYZE;"

# 5. Restart services
docker-compose restart php queue
```

---

### High Memory Usage

**Actions:**
```bash
# 1. Identify memory hogs
docker stats --no-stream

# 2. Restart memory-heavy services
docker-compose restart elasticsearch php

# 3. Adjust Elasticsearch heap size
# In docker-compose.yml:
# ES_JAVA_OPTS=-Xms1g -Xmx1g

# 4. Adjust PHP memory limit
# In docker/php/php.ini:
# memory_limit=512M

# 5. Monitor after changes
docker stats
```

---

## 8. User Management

### Create Admin User

```bash
# Via Tinker
docker exec -it php php artisan tinker
>>> $user = User::create([
...   'name' => 'Admin User',
...   'email' => 'admin@entoo.cz',
...   'password' => bcrypt('secure_password'),
...   'is_admin' => true
... ]);
>>> exit

# Or via SQL
docker exec entoo_postgres psql -U entoo_user -d entoo -c \
  "UPDATE users SET is_admin = TRUE WHERE email = 'user@example.com';"
```

---

### Reset User Password

```bash
# Via Tinker
docker exec -it php php artisan tinker
>>> $user = User::where('email', 'user@example.com')->first();
>>> $user->password = bcrypt('new_password');
>>> $user->save();
>>> exit
```

---

### Bulk User Import

```bash
# Create CSV file: users.csv
# name,email,password,is_admin
# John Doe,john@example.com,password123,false
# Jane Admin,jane@example.com,admin123,true

# Import via custom command (if created)
docker exec php php artisan users:import users.csv
```

---

## 9. Common Operations Quick Reference

### Cache Operations

```bash
# Clear all caches
docker exec php php artisan cache:clear-all

# Clear specific cache
docker exec php php artisan cache:clear
docker exec php php artisan config:clear
docker exec php php artisan route:clear
docker exec php php artisan view:clear

# Warm caches
docker exec php php artisan cache:warm-stats
docker exec php php artisan cache:warm-dashboard
```

---

### Queue Operations

```bash
# Monitor queue in real-time
docker exec php php artisan queue:monitor redis

# List failed jobs
docker exec php php artisan queue:failed

# Retry failed job
docker exec php php artisan queue:retry <job-id>

# Retry all failed jobs
docker exec php php artisan queue:retry all

# Clear failed jobs
docker exec php php artisan queue:flush

# Process one job (manual)
docker exec php php artisan queue:work --once
```

---

### Database Operations

```bash
# Run migrations
docker exec php php artisan migrate

# Rollback last migration
docker exec php php artisan migrate:rollback

# Migration status
docker exec php php artisan migrate:status

# Fresh database (⚠️ DATA LOSS)
docker exec php php artisan migrate:fresh --seed

# Database backup
docker exec entoo_postgres pg_dump -U entoo_user entoo > backup.sql

# Database restore
cat backup.sql | docker exec -i entoo_postgres psql -U entoo_user -d entoo
```

---

### Elasticsearch Operations

```bash
# Initialize index
docker exec php php artisan elasticsearch:init

# Re-index all files
docker exec php php artisan elasticsearch:reindex

# Re-index metadata only (fast)
docker exec php php artisan elasticsearch:reindex --skip-content

# Check index health
curl http://localhost:9200/entoo_documents/_count

# Delete and recreate index
curl -X DELETE http://localhost:9200/entoo_documents
docker exec php php artisan elasticsearch:init
docker exec php php artisan elasticsearch:reindex
```

---

## 10. Checklists

### Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Database migrations tested
- [ ] Backup completed
- [ ] Team notified
- [ ] Deployment window scheduled
- [ ] Rollback plan ready
- [ ] Monitoring alerts configured

---

### Post-Deployment Checklist

- [ ] Services restarted
- [ ] Health check passing
- [ ] Critical endpoints tested
- [ ] No errors in logs
- [ ] Queue processing normally
- [ ] Search working
- [ ] File upload/download working
- [ ] Admin panel accessible
- [ ] Performance acceptable
- [ ] Team notified of completion

---

### Monthly Maintenance Checklist

- [ ] Security updates applied
- [ ] Database optimized
- [ ] Elasticsearch re-indexed
- [ ] Logs rotated
- [ ] Backups verified
- [ ] Disk space checked
- [ ] Performance reviewed
- [ ] Documentation updated

---

**Last Updated:** 2025-11-13
**Version:** 1.0
**Maintained By:** Development Team
