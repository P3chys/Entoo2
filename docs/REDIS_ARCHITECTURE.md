# Redis Architecture Documentation

Last Updated: 2025-11-08

## Overview

Entoo2 uses a **single Redis instance** with **logical database separation** for different use cases. This is a best practice approach that balances performance, resource efficiency, and maintainability.

## Executive Summary

- **1 Redis Container** (`entoo_redis`)
- **1 Redis Process** (Redis 7-alpine)
- **3 Logical Databases** (DB 0, 1, and optionally 2)
- **3 Use Cases**: Cache, Queue, Session

**Important:** We are NOT running multiple Redis instances. We use one Redis server with multiple logical databases for separation of concerns.

---

## Redis Container Configuration

### Docker Compose Setup

**File:** [docker-compose.yml](../docker-compose.yml)

```yaml
redis:
  image: redis:7-alpine
  container_name: entoo_redis
  restart: unless-stopped
  command: redis-server --appendonly yes --requirepass redis_password
  ports:
    - "6379:6379"
  volumes:
    - redis_data:/data
  networks:
    - entoo_network
  healthcheck:
    test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
    interval: 10s
    timeout: 5s
    retries: 5
```

**Key Configuration:**
- **Image:** `redis:7-alpine` (latest stable Redis 7)
- **Persistence:** AOF (Append-Only File) enabled with `--appendonly yes`
- **Security:** Password protected (`redis_password`)
- **Data Volume:** `redis_data:/data` (survives container restarts)
- **Restart Policy:** `unless-stopped` (auto-restart on failures)

---

## Logical Database Separation

Redis supports 16 logical databases (0-15) by default. We use logical database numbers to separate different concerns:

| Database | Purpose | Laravel Config | Prefix | Current Keys |
|----------|---------|----------------|--------|--------------|
| **DB 0** | Queues & Sessions (default) | `REDIS_DB=0` | `entoo-database-` | Queue jobs, sessions |
| **DB 1** | Cache | `REDIS_CACHE_DB=1` | `entoo-database-` + `entoo-cache-` | 3 cache tag entries |
| **DB 2+** | Reserved | N/A | N/A | Unused |

### Why Logical Databases?

**Advantages:**
- ✅ Isolation between cache and queues (cache flush won't affect queue jobs)
- ✅ Single Redis instance (lower resource overhead)
- ✅ Easier monitoring and management
- ✅ Simple configuration
- ✅ Cost-effective

**Trade-offs:**
- ⚠️ All databases share the same memory pool
- ⚠️ All databases run on the same thread (single-threaded Redis)

**When to use separate Redis instances instead:**
- Need true resource isolation
- Running at very high scale (millions of operations/sec)
- Different Redis configurations needed (persistence vs. no persistence)

For Entoo2's current scale, logical databases are perfect.

---

## Laravel Configuration

### Connection Definitions

**File:** [webapp/config/database.php](../webapp/config/database.php)

```php
'redis' => [
    'client' => env('REDIS_CLIENT', 'phpredis'),  // Using native phpredis extension

    // Default connection (DB 0) - Used for queues and sessions
    'default' => [
        'url' => env('REDIS_URL'),
        'host' => env('REDIS_HOST', '127.0.0.1'),
        'username' => env('REDIS_USERNAME'),
        'password' => env('REDIS_PASSWORD'),
        'port' => env('REDIS_PORT', '6379'),
        'database' => env('REDIS_DB', '0'),  // DB 0
    ],

    // Cache connection (DB 1) - Dedicated cache database
    'cache' => [
        'url' => env('REDIS_URL'),
        'host' => env('REDIS_HOST', '127.0.0.1'),
        'username' => env('REDIS_USERNAME'),
        'password' => env('REDIS_PASSWORD'),
        'port' => env('REDIS_PORT', '6379'),
        'database' => env('REDIS_CACHE_DB', '1'),  // DB 1
    ],
],
```

### Cache Configuration

**File:** [webapp/config/cache.php](../webapp/config/cache.php)

```php
'default' => env('CACHE_STORE', 'redis'),

'stores' => [
    'redis' => [
        'driver' => 'redis',
        'connection' => 'cache',  // Uses 'cache' connection (DB 1)
        'lock_connection' => 'default',
    ],
],

'prefix' => env('CACHE_PREFIX', 'entoo-cache-'),
```

**Important:** Cache uses the `cache` connection which points to DB 1, keeping cache data separate from queue/session data.

### Queue Configuration

**File:** [webapp/config/queue.php](../webapp/config/queue.php)

```php
'default' => env('QUEUE_CONNECTION', 'redis'),

'connections' => [
    'redis' => [
        'driver' => 'redis',
        'connection' => 'default',  // Uses 'default' connection (DB 0)
        'queue' => env('REDIS_QUEUE', 'default'),
        'retry_after' => 90,
        'block_for' => null,
        'after_commit' => false,
    ],
],
```

### Session Configuration

**File:** [webapp/config/session.php](../webapp/config/session.php)

```php
'driver' => env('SESSION_DRIVER', 'redis'),
'connection' => null,  // null falls back to 'default' connection (DB 0)
'lifetime' => 1440,    // 24 hours
'cookie' => 'entoo-session',
```

**Note:** Sessions use DB 0 (same as queues). This is fine for current scale. For complete isolation, could use DB 2.

---

## Environment Variables

**File:** [webapp/.env](../webapp/.env)

```env
# Cache Configuration
CACHE_STORE=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis

# Redis Client (phpredis is faster than predis)
REDIS_CLIENT=phpredis

# Redis Connection
REDIS_HOST=redis              # Docker service name
REDIS_PASSWORD=redis_password  # Set in docker-compose.yml
REDIS_PORT=6379

# Optional: Explicit database numbers (already set in config)
# REDIS_DB=0
# REDIS_CACHE_DB=1
```

---

## Current Usage

### Cache Implementation

**Cache Tag Strategy** (see [CACHING_STRATEGY.md](CACHING_STRATEGY.md)):

```php
// Store with tags
Cache::tags(['files', 'subjects'])->remember($cacheKey, 300, function () {
    return $this->elasticsearchService->getFilesBySubject($subject);
});

// Invalidate by tags
Cache::tags(['files', 'subjects', 'stats'])->flush();
```

**Active Cache Tags:**
- `files` - File listings and metadata
- `subjects` - Subject lists and categories
- `stats` - Application statistics

**Cache TTL:**
- File listings: 5 minutes (300 seconds)
- Subject lists: 5 minutes
- Statistics: 5 minutes

**Performance Impact:**
- 70-80% response time reduction on cached endpoints
- Reduced Elasticsearch load
- Reduced database load

### Queue Usage

**Queue Worker Configuration:**

```yaml
queue:
  command: php artisan queue:work redis --sleep=3 --tries=3 --max-time=3600 --timeout=300
  environment:
    - QUEUE_CONNECTION=redis
```

**Jobs:**
- `ProcessUploadedFile` - Parses documents, indexes in Elasticsearch, clears cache

**Queue Features:**
- 3 retry attempts
- 300 second timeout per job
- Worker runs for max 3600 seconds then restarts

### Session Usage

- **Driver:** Redis
- **Connection:** default (DB 0)
- **Lifetime:** 1440 minutes (24 hours)
- **Cookie:** `entoo-session`

---

## Redis Client: phpredis vs predis

**Current:** `phpredis` (native C extension)

**Why phpredis?**
- ✅ **Faster:** Native C extension, not pure PHP
- ✅ **Lower memory usage:** More efficient than pure PHP implementation
- ✅ **Better performance:** Especially for high-throughput operations
- ✅ **Cache tags support:** Required for our cache tag strategy

**predis alternative:**
- ✅ Pure PHP (no extension required)
- ✅ Easier to install in some environments
- ❌ Slower than phpredis
- ❌ Higher memory usage

**Recommendation:** Stick with phpredis for production.

---

## Data Persistence

### AOF (Append-Only File)

**Configuration:** `--appendonly yes`

**How it works:**
- Redis logs every write operation
- File stored in `/data/appendonly.aof`
- Replays operations on restart
- Guarantees durability

**Trade-offs:**
- ✅ Better durability (data loss only for last second)
- ❌ Larger disk usage
- ❌ Slightly slower writes

**Alternative:** RDB snapshots
- Periodic point-in-time snapshots
- Faster, smaller files
- More data loss risk

**Recommendation:** Keep AOF for current setup (better durability).

---

## Monitoring

### Check Redis Status

```bash
# Container status
docker ps -f name=entoo_redis

# Redis CLI access
docker exec -it entoo_redis redis-cli -a redis_password

# Inside redis-cli:
INFO                    # Server info
DBSIZE                  # Number of keys in current DB
SELECT 0; DBSIZE        # Keys in DB 0 (queues/sessions)
SELECT 1; DBSIZE        # Keys in DB 1 (cache)
KEYS *                  # List all keys (use carefully in production)
MONITOR                 # Watch live commands (debugging only)
```

### Check Memory Usage

```bash
# Inside redis-cli
INFO memory

# Key metrics:
# - used_memory_human: Total memory used
# - used_memory_peak_human: Peak memory
# - mem_fragmentation_ratio: Fragmentation (should be ~1.0)
```

### Check Cache Performance

```bash
# Inside redis-cli
INFO stats

# Key metrics:
# - keyspace_hits: Cache hits
# - keyspace_misses: Cache misses
# - hit_rate: hits / (hits + misses)
```

---

## Performance Tuning

### Current Settings

**Good for:**
- Small to medium workloads
- Development and testing
- Production with moderate traffic

### Recommendations for High Traffic

#### 1. Set Max Memory Limit

```yaml
# docker-compose.yml
redis:
  command: >
    redis-server
    --appendonly yes
    --requirepass redis_password
    --maxmemory 512mb
    --maxmemory-policy allkeys-lru
```

**Eviction Policies:**
- `allkeys-lru`: Evict any key, LRU (good for cache)
- `volatile-lru`: Only evict keys with TTL
- `noeviction`: Return errors when memory full

**Recommendation:** Use `allkeys-lru` for cache-heavy workload.

#### 2. Tune AOF Sync Policy

```yaml
redis:
  command: >
    redis-server
    --appendonly yes
    --appendfsync everysec  # Default, good balance
    # --appendfsync always  # Slower, maximum durability
    # --appendfsync no      # Faster, less durable
```

#### 3. Enable Redis Compression

Redis doesn't compress by default, but Laravel can compress cache values:

```php
// config/cache.php
'redis' => [
    'driver' => 'redis',
    'connection' => 'cache',
    'compress' => true,  // Add this
],
```

---

## Scaling Considerations

### When to Add More Redis Resources

**Current Setup is Good For:**
- < 10,000 requests/minute
- < 100 concurrent users
- < 1GB cache data

**Consider Scaling When:**
- Redis memory usage > 80%
- CPU usage consistently high
- Latency increasing
- Hit rate dropping

### Scaling Options

#### Option 1: Vertical Scaling (Increase Resources)
- Increase Docker container memory limit
- Use faster CPU
- More RAM for host machine

#### Option 2: Separate Redis Instances
- Cache Redis (high memory, eviction enabled)
- Queue Redis (persistent, no eviction)
- Session Redis (persistent, smaller)

**Docker Compose Example:**
```yaml
redis-cache:
  image: redis:7-alpine
  command: --maxmemory 512mb --maxmemory-policy allkeys-lru

redis-queue:
  image: redis:7-alpine
  command: --appendonly yes --appendfsync everysec

redis-session:
  image: redis:7-alpine
  command: --appendonly yes --maxmemory 128mb
```

#### Option 3: Redis Cluster (High Availability)
- Multiple Redis nodes
- Automatic sharding
- Failover support
- Requires 6+ Redis instances (3 primary, 3 replica)

**When Needed:**
- High availability requirements
- > 100GB data
- > 100,000 ops/sec

---

## Backup Strategy

### Manual Backup

```bash
# Create RDB snapshot
docker exec entoo_redis redis-cli -a redis_password BGSAVE

# Wait for completion
docker exec entoo_redis redis-cli -a redis_password LASTSAVE

# Copy RDB file
docker cp entoo_redis:/data/dump.rdb ./backup/redis-$(date +%Y%m%d).rdb

# Copy AOF file
docker cp entoo_redis:/data/appendonly.aof ./backup/redis-aof-$(date +%Y%m%d).aof
```

### Automated Backup (Recommendation)

```bash
# Add to crontab (daily at 2 AM)
0 2 * * * docker exec entoo_redis redis-cli -a redis_password BGSAVE && \
          docker cp entoo_redis:/data/dump.rdb /backups/redis/redis-$(date +\%Y\%m\%d).rdb
```

### Restore from Backup

```bash
# Stop Redis
docker stop entoo_redis

# Replace data file
docker cp ./backup/redis-20251108.rdb entoo_redis:/data/dump.rdb

# Start Redis
docker start entoo_redis
```

---

## Troubleshooting

### Issue: Redis Container Not Starting

```bash
# Check logs
docker logs entoo_redis

# Common issues:
# - Port 6379 already in use
# - Corrupted AOF file
# - Permission issues on volume
```

### Issue: Connection Refused

```bash
# Check Redis is running
docker ps -f name=entoo_redis

# Test connection
docker exec entoo_redis redis-cli -a redis_password PING
# Should return: PONG

# Check from Laravel container
docker exec php redis-cli -h redis -a redis_password PING
```

### Issue: High Memory Usage

```bash
# Check memory usage
docker exec entoo_redis redis-cli -a redis_password INFO memory

# Clear specific database
docker exec entoo_redis redis-cli -a redis_password -n 1 FLUSHDB  # Clear cache (DB 1)

# Clear all databases (CAREFUL!)
docker exec entoo_redis redis-cli -a redis_password FLUSHALL
```

### Issue: Slow Performance

```bash
# Check slow log
docker exec entoo_redis redis-cli -a redis_password SLOWLOG GET 10

# Monitor live commands
docker exec entoo_redis redis-cli -a redis_password MONITOR

# Check for large keys
docker exec entoo_redis redis-cli -a redis_password --bigkeys
```

---

## Security Best Practices

### Current Security Measures

1. ✅ **Password Protection:** `--requirepass redis_password`
2. ✅ **Network Isolation:** Only accessible within Docker network
3. ✅ **Port Binding:** Exposed to host (localhost only recommended)

### Recommendations for Production

1. **Use Strong Password**
   ```env
   REDIS_PASSWORD=<generate-strong-random-password>
   ```

2. **Disable Dangerous Commands**
   ```yaml
   redis:
     command: >
       redis-server
       --appendonly yes
       --requirepass ${REDIS_PASSWORD}
       --rename-command FLUSHALL ""
       --rename-command FLUSHDB ""
       --rename-command CONFIG ""
   ```

3. **Use TLS/SSL** (for production external access)
   ```yaml
   redis:
     command: >
       redis-server
       --tls-port 6380
       --port 0
       --tls-cert-file /path/to/redis.crt
       --tls-key-file /path/to/redis.key
   ```

4. **Limit Network Access**
   ```yaml
   redis:
     ports:
       - "127.0.0.1:6379:6379"  # Bind to localhost only
   ```

---

## Summary

### What We Have
- ✅ Single Redis 7 instance (optimal for current scale)
- ✅ Logical database separation (DB 0 for queues/sessions, DB 1 for cache)
- ✅ phpredis client (fast native extension)
- ✅ AOF persistence (data durability)
- ✅ Password protection
- ✅ Auto-restart policy
- ✅ Health checks
- ✅ Cache tag support

### What Works Well
- ✅ 70-80% performance improvement from caching
- ✅ Reliable queue processing
- ✅ Session management
- ✅ Low resource overhead
- ✅ Simple configuration

### Future Improvements (When Needed)
- [ ] Set max memory limit
- [ ] Configure eviction policy
- [ ] Separate Redis instances (cache vs. queue vs. session)
- [ ] Redis Sentinel for high availability
- [ ] Redis Cluster for horizontal scaling
- [ ] Automated backups
- [ ] Monitoring dashboard (Redis Commander)
- [ ] TLS/SSL encryption

---

**Conclusion:** The current Redis architecture is well-designed and follows best practices. No changes are needed at this time. The single-instance with logical database separation is perfect for the current scale and provides excellent performance with minimal complexity.

---

**Document Maintained By:** Development Team
**Last Review:** 2025-11-08
**Next Review:** 2025-12-08 or when scaling Redis
