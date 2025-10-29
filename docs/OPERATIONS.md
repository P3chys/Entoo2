# Entoo Operations Manual

**Document Version:** 2.0
**Last Updated:** 2025-10-26
**System:** Entoo Document Management & Search System

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Starting and Stopping Services](#starting-and-stopping-services)
3. [Daily Operations](#daily-operations)
4. [Cache Management](#cache-management)
5. [Database Operations](#database-operations)
6. [File Management](#file-management)
7. [Search Operations](#search-operations)
8. [Monitoring and Logs](#monitoring-and-logs)
9. [Backup and Recovery](#backup-and-recovery)
10. [Troubleshooting](#troubleshooting)
11. [Performance Optimization](#performance-optimization)
12. [Security Operations](#security-operations)

---

## System Overview

### Service Architecture
The Entoo system consists of 7 containerized services:

| Service | Container Name | Port(s) | Purpose |
|---------|----------------|---------|---------|
| Nginx | entoo_nginx | 8000 | Web server and reverse proxy |
| PHP-FPM | entoo_php | 9000 | Laravel application runtime |
| PostgreSQL | entoo_postgres | 5432 | Primary database |
| Redis | entoo_redis | 6379 | Cache and session storage |
| Elasticsearch | entoo_elasticsearch | 9200, 9300 | Search engine |
| Kibana | entoo_kibana | 5601 | Elasticsearch management UI |
| Dozzle | entoo_dozzle | 8888 | Docker log viewer |

### Access URLs
- **Application:** http://localhost:8000
- **Elasticsearch API:** http://localhost:9200
- **Kibana Dashboard:** http://localhost:5601
- **Log Viewer (Dozzle):** http://localhost:8888

---

## Starting and Stopping Services

### Start All Services
```bash
# Start all services in detached mode
docker-compose up -d

# Start with logs visible
docker-compose up
```

### Stop All Services
```bash
# Stop all services (preserve data)
docker-compose down

# Stop and remove all data (CAUTION!)
docker-compose down -v
```

### Restart Services
```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart php
docker-compose restart nginx
docker-compose restart postgres
```

### Check Service Status
```bash
# View all container status
docker-compose ps

# Check health status
docker ps

# Check if specific service is healthy
docker inspect --format='{{.State.Health.Status}}' entoo_postgres
```

### Rebuild Services
```bash
# Rebuild all containers
docker-compose build

# Rebuild and start
docker-compose up -d --build

# Rebuild specific service
docker-compose build php
```

---

## Daily Operations

### Morning Startup Checklist
```bash
# 1. Start all services
docker-compose up -d

# 2. Wait for services to be healthy (30-60 seconds)
docker-compose ps

# 3. Check Redis cache
docker exec entoo_redis redis-cli -a redis_password PING

# 4. Check database connection
docker exec entoo_postgres pg_isready -U entoo_user -d entoo

# 5. Check Elasticsearch health
curl http://localhost:9200/_cluster/health?pretty

# 6. Verify application
curl -I http://localhost:8000
```

### Evening Shutdown Checklist
```bash
# 1. Check for active sessions
docker exec entoo_redis redis-cli -a redis_password INFO clients

# 2. Backup database (if needed)
docker exec entoo_postgres pg_dump -U entoo_user entoo > backup_$(date +%Y%m%d).sql

# 3. Clear temporary caches (optional)
docker exec entoo_php php artisan cache:clear

# 4. Stop services
docker-compose down
```

---

## Cache Management

### Cache Manager Utility
The system includes a cache management utility script:

```bash
# Show available commands
cache-manager.bat

# Clear all caches
cache-manager.bat clear

# View cache statistics
cache-manager.bat stats

# Optimize application (cache routes/config)
cache-manager.bat optimize

# Test Redis connection
cache-manager.bat test
```

### Manual Cache Operations

#### Clear Caches
```bash
# Clear application cache
docker exec entoo_php php artisan cache:clear

# Clear configuration cache
docker exec entoo_php php artisan config:clear

# Clear route cache
docker exec entoo_php php artisan route:clear

# Clear view cache
docker exec entoo_php php artisan view:clear

# Clear ALL caches
docker exec entoo_php php artisan optimize:clear
```

#### Optimize/Cache
```bash
# Cache configuration
docker exec entoo_php php artisan config:cache

# Cache routes
docker exec entoo_php php artisan route:cache

# Cache views
docker exec entoo_php php artisan view:cache

# Optimize everything
docker exec entoo_php php artisan optimize
```

#### Redis Cache Operations
```bash
# Connect to Redis CLI
docker exec -it entoo_redis redis-cli -a redis_password

# Inside Redis CLI:
PING                          # Test connection
KEYS *                        # List all keys
KEYS entoo*                   # List application keys
DBSIZE                        # Count keys
FLUSHDB                       # Clear current database
INFO stats                    # View statistics
GET key_name                  # Get specific key
DEL key_name                  # Delete specific key
TTL key_name                  # Check key expiration
EXIT                          # Quit
```

#### View Cache Statistics
```bash
# Redis statistics
docker exec entoo_redis redis-cli -a redis_password INFO stats | grep -E "keyspace_hits|keyspace_misses"

# Number of cached items
docker exec entoo_redis redis-cli -a redis_password DBSIZE

# Memory usage
docker exec entoo_redis redis-cli -a redis_password INFO memory | grep used_memory_human
```

---

## Database Operations

### Connect to Database
```bash
# Connect via psql
docker exec -it entoo_postgres psql -U entoo_user -d entoo

# Connect via docker-compose
docker-compose exec postgres psql -U entoo_user -d entoo
```

### Common Database Commands
```sql
-- Inside PostgreSQL:
\dt                           -- List tables
\d table_name                 -- Describe table structure
\l                            -- List databases
\du                           -- List users
\q                            -- Quit

-- View uploaded files
SELECT id, original_filename, subject_name, category, created_at
FROM uploaded_files
ORDER BY created_at DESC
LIMIT 10;

-- Count files by subject
SELECT subject_name, COUNT(*)
FROM uploaded_files
GROUP BY subject_name
ORDER BY COUNT(*) DESC;

-- View users
SELECT id, name, email, created_at FROM users;
```

### Run Migrations
```bash
# Run all pending migrations
docker exec entoo_php php artisan migrate

# Rollback last migration
docker exec entoo_php php artisan migrate:rollback

# Reset and re-run all migrations (CAUTION!)
docker exec entoo_php php artisan migrate:fresh

# Check migration status
docker exec entoo_php php artisan migrate:status
```

### Database Backup
```bash
# Backup database
docker exec entoo_postgres pg_dump -U entoo_user entoo > entoo_backup_$(date +%Y%m%d_%H%M%S).sql

# Backup with compression
docker exec entoo_postgres pg_dump -U entoo_user entoo | gzip > entoo_backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Database Restore
```bash
# Restore from backup
docker exec -i entoo_postgres psql -U entoo_user -d entoo < backup_file.sql

# Restore from compressed backup
gunzip < backup_file.sql.gz | docker exec -i entoo_postgres psql -U entoo_user -d entoo
```

### Database Maintenance
```bash
# Connect to database
docker exec -it entoo_postgres psql -U entoo_user -d entoo

-- Inside PostgreSQL:
-- Analyze database
ANALYZE;

-- Vacuum database
VACUUM;

-- Check database size
SELECT pg_size_pretty(pg_database_size('entoo'));

-- Check table sizes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## File Management

### File Storage Structure
```
storage/app/
└── uploads/
    └── {subject-slug}/
        └── {category-slug}/
            └── {uuid}.{extension}
```

### Import Files from Old System
```bash
# Location of old files
# /old_entoo/entoo_subjects/{subject}/{category}/{files}

# Import existing files
docker exec entoo_php php artisan import:existing-files

# Check import status
docker exec entoo_php php artisan import:status

# Import specific subject
docker exec entoo_php php artisan import:subject "Subject Name"
```

### File Operations
```bash
# Count total files
docker exec entoo_postgres psql -U entoo_user -d entoo -c "SELECT COUNT(*) FROM uploaded_files;"

# Check storage usage
docker exec entoo_php du -sh /var/www/html/storage/app/uploads

# Find large files
docker exec entoo_php find /var/www/html/storage/app/uploads -type f -size +10M -exec ls -lh {} \;

# Count files by extension
docker exec entoo_postgres psql -U entoo_user -d entoo -c "SELECT file_extension, COUNT(*) FROM uploaded_files GROUP BY file_extension;"
```

### File Upload via API
```bash
# Upload file using curl
curl -X POST http://localhost:8000/api/files \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/document.pdf" \
  -F "subject_name=Test Subject" \
  -F "category=Materialy"
```

---

## Search Operations

### Elasticsearch Health
```bash
# Check cluster health
curl http://localhost:9200/_cluster/health?pretty

# List all indices
curl http://localhost:9200/_cat/indices?v

# Get index details
curl http://localhost:9200/documents?pretty
```

### Search via API
```bash
# Basic search
curl "http://localhost:8000/api/search?q=keyword" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Search with options
curl "http://localhost:8000/api/search?q=keyword&size=50" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Reindex Documents
```bash
# Reindex all documents
docker exec entoo_php php artisan search:reindex

# Clear and reindex
docker exec entoo_php php artisan search:flush
docker exec entoo_php php artisan search:reindex
```

### Elasticsearch Maintenance
```bash
# Delete an index
curl -X DELETE http://localhost:9200/documents

# View index mappings
curl http://localhost:9200/documents/_mapping?pretty

# View index settings
curl http://localhost:9200/documents/_settings?pretty

# Get document count
curl http://localhost:9200/documents/_count?pretty
```

---

## Monitoring and Logs

### View Logs

#### Dozzle (Web Interface)
Access http://localhost:8888 for real-time log viewing with search and filtering.

#### Docker Compose Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f php
docker-compose logs -f nginx
docker-compose logs -f postgres
docker-compose logs -f elasticsearch

# Last 100 lines
docker-compose logs --tail=100 php

# Since timestamp
docker-compose logs --since 2025-10-26T10:00:00 php
```

#### Laravel Logs
```bash
# View Laravel logs
docker exec entoo_php tail -f /var/www/html/storage/logs/laravel.log

# View last 50 lines
docker exec entoo_php tail -50 /var/www/html/storage/logs/laravel.log

# Search for errors
docker exec entoo_php grep "ERROR" /var/www/html/storage/logs/laravel.log
```

### System Monitoring
```bash
# Container resource usage
docker stats

# Specific container stats
docker stats entoo_php entoo_postgres entoo_elasticsearch

# Disk usage
docker system df

# Container processes
docker top entoo_php
```

### Application Health Check
```bash
# Health endpoint
curl http://localhost:8000/api/health | json_pp

# Stats endpoint
curl http://localhost:8000/api/stats | json_pp

# Database check
docker exec entoo_php php artisan db:show
```

---

## Backup and Recovery

### Full System Backup
```bash
#!/bin/bash
# backup-entoo.sh

BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# 1. Backup database
docker exec entoo_postgres pg_dump -U entoo_user entoo | gzip > "$BACKUP_DIR/database.sql.gz"

# 2. Backup uploaded files
tar -czf "$BACKUP_DIR/uploads.tar.gz" -C storage/app uploads/

# 3. Backup environment config
cp webapp/.env "$BACKUP_DIR/env.backup"

# 4. Backup Elasticsearch indices
curl -X PUT "localhost:9200/_snapshot/backup/snapshot_$(date +%Y%m%d_%H%M%S)?wait_for_completion=true"

echo "Backup completed: $BACKUP_DIR"
```

### Restore from Backup
```bash
# 1. Stop services
docker-compose down

# 2. Restore database
gunzip < backups/20251026/database.sql.gz | docker exec -i entoo_postgres psql -U entoo_user -d entoo

# 3. Restore files
tar -xzf backups/20251026/uploads.tar.gz -C storage/app/

# 4. Restore environment
cp backups/20251026/env.backup webapp/.env

# 5. Start services
docker-compose up -d

# 6. Clear caches
docker exec entoo_php php artisan cache:clear
docker exec entoo_php php artisan config:cache

# 7. Reindex search
docker exec entoo_php php artisan search:reindex
```

---

## Troubleshooting

### Service Won't Start
```bash
# Check logs
docker-compose logs service_name

# Check port conflicts
netstat -ano | findstr :8000
netstat -ano | findstr :5432

# Remove and recreate
docker-compose down
docker-compose up -d --force-recreate
```

### Database Connection Issues
```bash
# Test connection
docker exec entoo_postgres pg_isready -U entoo_user -d entoo

# Check if database exists
docker exec entoo_postgres psql -U entoo_user -l

# Check environment variables
docker exec entoo_php env | grep DB_

# Recreate database
docker exec entoo_postgres psql -U entoo_user -c "DROP DATABASE IF EXISTS entoo;"
docker exec entoo_postgres psql -U entoo_user -c "CREATE DATABASE entoo;"
docker exec entoo_php php artisan migrate
```

### Redis Connection Issues
```bash
# Test connection
docker exec entoo_redis redis-cli -a redis_password PING

# Check if Redis is running
docker exec entoo_redis redis-cli -a redis_password INFO server

# Flush and restart
docker exec entoo_redis redis-cli -a redis_password FLUSHALL
docker-compose restart redis
```

### Elasticsearch Issues
```bash
# Check health
curl http://localhost:9200/_cluster/health?pretty

# Check logs
docker-compose logs elasticsearch

# Restart Elasticsearch
docker-compose restart elasticsearch

# Wait for yellow status (single node)
until curl -s http://localhost:9200/_cluster/health | grep -q '"status":"yellow"'; do
    sleep 5
    echo "Waiting for Elasticsearch..."
done
```

### Application Errors (500)
```bash
# Check Laravel logs
docker exec entoo_php tail -100 /var/www/html/storage/logs/laravel.log

# Check permissions
docker exec entoo_php chmod -R 775 /var/www/html/storage
docker exec entoo_php chown -R www-data:www-data /var/www/html/storage

# Clear all caches
docker exec entoo_php php artisan optimize:clear

# Regenerate autoload
docker exec entoo_php composer dump-autoload
```

### Performance Issues
```bash
# Check cache hit ratio
cache-manager.bat stats

# Optimize application
cache-manager.bat optimize

# Check slow queries
docker exec entoo_postgres psql -U entoo_user -d entoo -c "
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;"

# Check Elasticsearch query performance
curl "http://localhost:9200/_nodes/stats?pretty"
```

---

## Performance Optimization

### Implemented Optimizations

#### Redis Caching
The application uses Redis for:
- **Session storage** - User sessions
- **Application cache** - API responses (5 min TTL)
- **Query cache** - Database query results

Cached endpoints:
- `/api/subjects` - All subjects list
- `/api/files` - File listings
- `/api/stats` - System statistics
- `/api/favorites` - User favorites
- `/api/subject-profiles` - Subject details

#### Database Indices
Optimized indices on `uploaded_files`:
- `subject_name` - Single column index
- `category` - Single column index
- `file_extension` - Single column index
- `created_at` - Single column index
- `(subject_name, category)` - Composite index

### Performance Commands
```bash
# Cache routes and config
docker exec entoo_php php artisan config:cache
docker exec entoo_php php artisan route:cache

# View cache statistics
cache-manager.bat stats

# Test endpoint performance
time curl -s "http://localhost:8000/api/stats" > /dev/null

# Check database query performance
docker exec entoo_postgres psql -U entoo_user -d entoo -c "
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;"
```

### Optimization Checklist
- [ ] Redis caching enabled (CACHE_STORE=redis)
- [ ] Routes cached (`php artisan route:cache`)
- [ ] Config cached (`php artisan config:cache`)
- [ ] Database indices created
- [ ] Elasticsearch tuned (heap size, memory)
- [ ] Opcache enabled in PHP
- [ ] Session driver set to Redis
- [ ] Queue connection set to Redis

---

## Security Operations

### User Management
```bash
# List users
docker exec entoo_php php artisan tinker --execute="User::all()->pluck('email');"

# Create admin user
docker exec entoo_php php artisan tinker --execute="
\$user = new App\Models\User();
\$user->name = 'Admin';
\$user->email = 'admin@entoo.local';
\$user->password = Hash::make('SecurePassword123');
\$user->save();
"

# Reset user password
docker exec entoo_php php artisan tinker --execute="
\$user = App\Models\User::where('email', 'user@example.com')->first();
\$user->password = Hash::make('NewPassword123');
\$user->save();
"
```

### Security Checks
```bash
# Check for failed login attempts (Laravel logs)
docker exec entoo_php grep "Failed login" /var/www/html/storage/logs/laravel.log

# Check active sessions
docker exec entoo_redis redis-cli -a redis_password KEYS "*session*" | wc -l

# Revoke all sessions
docker exec entoo_redis redis-cli -a redis_password FLUSHDB

# Check file permissions
docker exec entoo_php ls -la /var/www/html/storage
```

### Update Dependencies
```bash
# Update Composer dependencies
docker exec entoo_php composer update

# Update npm dependencies (if using frontend build)
docker exec entoo_php npm update

# Check for security vulnerabilities
docker exec entoo_php composer audit
```

---

## Quick Reference Card

### Most Used Commands
```bash
# Start system
docker-compose up -d

# Stop system
docker-compose down

# View logs
docker-compose logs -f php

# Clear cache
docker exec entoo_php php artisan cache:clear

# Check health
curl http://localhost:8000/api/health

# Connect to database
docker exec -it entoo_postgres psql -U entoo_user -d entoo

# Connect to Redis
docker exec -it entoo_redis redis-cli -a redis_password

# Run migrations
docker exec entoo_php php artisan migrate

# Backup database
docker exec entoo_postgres pg_dump -U entoo_user entoo > backup.sql

# Cache manager
cache-manager.bat stats
cache-manager.bat clear
cache-manager.bat optimize
```

### Emergency Procedures

#### Complete System Reset
```bash
# WARNING: This will delete all data!
docker-compose down -v
docker system prune -a --volumes -f
docker-compose up -d
docker exec entoo_php php artisan migrate
docker exec entoo_php php artisan db:seed
```

#### Quick Recovery
```bash
docker-compose restart
docker exec entoo_php php artisan cache:clear
docker exec entoo_php php artisan config:cache
curl http://localhost:8000/api/health
```

---

**End of Operations Manual**
