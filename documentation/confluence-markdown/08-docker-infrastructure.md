# Docker Infrastructure and Deployment

## Quick Reference

| Service | Container Name | Port(s) | Purpose |
|---------|---------------|---------|---------|
| **PostgreSQL** | `entoo_postgres` | 5432 | Primary database |
| **Redis** | `entoo_redis` | 6379 | Cache and queue backend |
| **Elasticsearch** | `entoo_elasticsearch` | 9200, 9300 | Full-text search engine |
| **Kibana** | `entoo_kibana` | 5601 | Elasticsearch visualization |
| **PHP (Octane)** | `php` | 8000 | Laravel application server |
| **Nginx** | `entoo_nginx` | 8000 (mapped) | Reverse proxy |
| **Queue Worker** | `entoo_queue` | - | Background job processor |
| **MailHog** | `entoo_mailhog` | 1025, 8025 | Email testing |
| **Dozzle** | `entoo_dozzle` | 8888 | Docker log viewer |

---

## Architecture Overview

### Service Stack

```
┌─────────────────────────────────────────────┐
│              Users / Browser                 │
└──────────────────┬──────────────────────────┘
                   │ HTTP :8000
          ┌────────▼────────┐
          │     Nginx       │ (Reverse Proxy)
          └────────┬────────┘
                   │
          ┌────────▼────────┐
          │  PHP (Octane)   │ (Laravel App)
          │     Swoole      │
          └─┬─────┬─────┬───┘
            │     │     │
    ┌───────▼─┐ ┌─▼─────────┐ ┌─▼────────────┐
    │PostgreSQL│ │   Redis   │ │Elasticsearch │
    │  :5432   │ │   :6379   │ │    :9200     │
    └──────────┘ └───────────┘ └──────────────┘

    ┌───────────────┐ ┌───────────────┐
    │ Queue Worker  │ │   MailHog     │
    │  (Background) │ │  :1025/:8025  │
    └───────────────┘ └───────────────┘
```

---

## 1. Docker Compose Configuration

### Main Configuration

**File:** `docker-compose.yml`

**Version:** 3.8

**Networks:**
- `entoo_network` (bridge driver)

**Volumes:**
- `postgres_data` - PostgreSQL data persistence
- `redis_data` - Redis data persistence
- `elasticsearch_data` - Elasticsearch indexes

---

### PostgreSQL Service

```yaml
postgres:
  image: postgres:15-alpine
  container_name: entoo_postgres
  restart: unless-stopped
  environment:
    POSTGRES_DB: entoo
    POSTGRES_USER: entoo_user
    POSTGRES_PASSWORD: entoo_password
  ports:
    - "${DB_PORT:-5432}:5432"
  volumes:
    - postgres_data:/var/lib/postgresql/data
  networks:
    - entoo_network
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U entoo_user -d entoo"]
    interval: 10s
    timeout: 5s
    retries: 5
```

**Configuration:**
- **Image:** postgres:15-alpine (lightweight Alpine-based)
- **Database:** `entoo`
- **User:** `entoo_user`
- **Password:** `entoo_password` (change in production!)
- **Port:** 5432 (mapped to host)
- **Data:** Persisted in `postgres_data` volume

**Healthcheck:**
- Command: `pg_isready`
- Checks every 10 seconds
- Fails after 5 retries

**Connection String:**
```
postgresql://entoo_user:entoo_password@localhost:5432/entoo
```

---

### Redis Service

```yaml
redis:
  image: redis:7-alpine
  container_name: entoo_redis
  restart: unless-stopped
  command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD:-redis_password}
  ports:
    - "${REDIS_PORT:-6379}:6379"
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

**Configuration:**
- **Image:** redis:7-alpine
- **Persistence:** AOF (Append-Only File) enabled
- **Password:** `redis_password` (change in production!)
- **Port:** 6379 (mapped to host)
- **Data:** Persisted in `redis_data` volume

**Features:**
- AOF persistence for data durability
- Password authentication
- Health checks

**Redis CLI Access:**
```bash
docker exec -it entoo_redis redis-cli
AUTH redis_password
PING
```

---

### Elasticsearch Service

```yaml
elasticsearch:
  image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
  container_name: entoo_elasticsearch
  restart: unless-stopped
  environment:
    - discovery.type=single-node
    - xpack.security.enabled=false
    - "ES_JAVA_OPTS=-Xms1g -Xmx1g"
    - bootstrap.memory_lock=true
  ulimits:
    memlock:
      soft: -1
      hard: -1
  ports:
    - "9200:9200"
    - "9300:9300"
  volumes:
    - elasticsearch_data:/usr/share/elasticsearch/data
  networks:
    - entoo_network
  healthcheck:
    test: ["CMD-SHELL", "curl -f http://localhost:9200/_cluster/health || exit 1"]
    interval: 10s
    timeout: 5s
    retries: 30
    start_period: 40s
```

**Configuration:**
- **Image:** elasticsearch:8.11.0
- **Mode:** Single-node (development/production)
- **Security:** Disabled (internal network only)
- **Heap Size:** 1GB min/max
- **Memory Lock:** Unlimited (for performance)
- **Ports:** 9200 (HTTP), 9300 (transport)

**Performance Tuning:**
- `ES_JAVA_OPTS=-Xms1g -Xmx1g` - Increased from default 512MB
- `bootstrap.memory_lock=true` - Prevents swapping
- `ulimits.memlock=-1` - Allows unlimited memory locking

**Health Check:**
- URL: `http://localhost:9200/_cluster/health`
- Start period: 40 seconds (ES takes time to start)
- Retries: 30 times

**Testing:**
```bash
curl http://localhost:9200/_cluster/health
curl http://localhost:9200/entoo_documents/_search
```

---

### Kibana Service

```yaml
kibana:
  image: docker.elastic.co/kibana/kibana:8.11.0
  container_name: entoo_kibana
  restart: unless-stopped
  environment:
    ELASTICSEARCH_HOSTS: http://elasticsearch:9200
  ports:
    - "5601:5601"
  networks:
    - entoo_network
  depends_on:
    elasticsearch:
      condition: service_healthy
  healthcheck:
    test: ["CMD-SHELL", "curl -f http://localhost:5601/api/status || exit 1"]
    interval: 30s
    timeout: 10s
    retries: 5
    start_period: 60s
```

**Configuration:**
- **Image:** kibana:8.11.0
- **Elasticsearch:** http://elasticsearch:9200
- **Port:** 5601
- **Start Period:** 60 seconds (Kibana is slow to start)

**Access:**
- URL: http://localhost:5601
- Use for Elasticsearch data visualization and debugging

**Use Cases:**
- View indexed documents
- Debug search queries
- Monitor index health
- Create visualizations

---

### PHP (Octane) Service

```yaml
php:
  build:
    context: .
    dockerfile: ./docker/php/Dockerfile
  container_name: php
  restart: unless-stopped
  working_dir: /var/www/html
  volumes:
    - ./webapp:/var/www/html
    - ./storage:/var/www/html/storage
    - ./docker/php/php.ini:/usr/local/etc/php/php.ini
    - ./old_entoo:/old_entoo:ro
  networks:
    - entoo_network
  environment:
    - DB_CONNECTION=pgsql
    - DB_HOST=postgres
    - DB_PORT=5432
    - DB_DATABASE=entoo
    - DB_USERNAME=entoo_user
    - DB_PASSWORD=entoo_password
    - REDIS_HOST=redis
    - REDIS_PASSWORD=redis_password
    - REDIS_PORT=6379
    - ELASTICSEARCH_HOST=http://elasticsearch:9200
    - ELASTICSEARCH_PORT=9200
  depends_on:
    postgres:
      condition: service_healthy
    redis:
      condition: service_healthy
    elasticsearch:
      condition: service_healthy
```

**Built From:** `docker/php/Dockerfile`

**Base Image:** php:8.2-cli-alpine

**PHP Extensions:**
- pdo, pdo_pgsql, pgsql - PostgreSQL database
- redis - Redis client
- swoole - Laravel Octane server
- opcache - Opcode caching
- gd - Image processing
- bcmath - Math functions
- zip - ZIP file handling
- pcntl - Process control
- intl - Internationalization

**Volumes:**
- `./webapp` → Application code
- `./storage` → File uploads and logs
- `./old_entoo` → Legacy files (read-only)

**Command:**
```bash
php artisan octane:start --server=swoole --host=0.0.0.0 --port=8000
```

**Why Octane:**
- Application stays in memory (no bootstrap on each request)
- 10-100x faster than PHP-FPM
- Perfect for high-traffic APIs

---

### Nginx Service

```yaml
nginx:
  image: nginx:alpine
  container_name: entoo_nginx
  restart: unless-stopped
  ports:
    - "${APP_PORT:-8000}:80"
  volumes:
    - ./webapp:/var/www/html
    - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf
    - ./docker/nginx/conf.d:/etc/nginx/conf.d
  networks:
    - entoo_network
  depends_on:
    - php
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s
```

**Configuration:**
- **Image:** nginx:alpine
- **Port:** 80 (container) → 8000 (host)
- **Config:** `docker/nginx/conf.d/octane.conf`

**Nginx Config (Octane):**
```nginx
server {
    listen 80;
    server_name localhost;
    root /var/www/html/public;

    location / {
        proxy_pass http://php:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /build {
        alias /var/www/html/public/build;
        access_log off;
        expires max;
        add_header Cache-Control "public, immutable";
    }
}
```

**Purpose:**
- Reverse proxy to PHP Octane
- Serve static assets
- SSL termination (if configured)
- Load balancing (if scaled)

---

### Queue Worker Service

```yaml
queue:
  build:
    context: .
    dockerfile: ./docker/php/Dockerfile
  container_name: entoo_queue
  working_dir: /var/www/html
  command: php artisan queue:work redis --sleep=3 --tries=3 --max-time=3600 --timeout=300
  volumes:
    - ./webapp:/var/www/html
    - ./storage:/var/www/html/storage
    - ./docker/php/php.ini:/usr/local/etc/php/php.ini
  networks:
    - entoo_network
  environment:
    - DB_CONNECTION=pgsql
    - DB_HOST=postgres
    - REDIS_HOST=redis
    - QUEUE_CONNECTION=redis
  depends_on:
    postgres:
      condition: service_healthy
    redis:
      condition: service_healthy
    elasticsearch:
      condition: service_healthy
  restart: unless-stopped
```

**Command Breakdown:**
- `queue:work redis` - Process jobs from Redis queue
- `--sleep=3` - Sleep 3 seconds when queue is empty
- `--tries=3` - Retry failed jobs 3 times
- `--max-time=3600` - Restart worker every 1 hour (memory management)
- `--timeout=300` - Kill job after 5 minutes

**Purpose:**
- Process `ProcessUploadedFile` jobs
- Extract text content from documents
- Index files in Elasticsearch

**Monitoring:**
```bash
# View queue worker logs
docker logs -f entoo_queue

# Check queue status
docker exec php php artisan queue:work redis --once --tries=1
```

---

### MailHog Service

```yaml
mailhog:
  image: mailhog/mailhog:latest
  container_name: entoo_mailhog
  restart: unless-stopped
  ports:
    - "1025:1025"  # SMTP server
    - "8025:8025"  # Web UI
  networks:
    - entoo_network
```

**Purpose:** Email testing tool (development only)

**Ports:**
- 1025 - SMTP server (Laravel sends emails here)
- 8025 - Web UI (view captured emails)

**Laravel Configuration:**
```env
MAIL_MAILER=smtp
MAIL_HOST=mailhog
MAIL_PORT=1025
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
```

**Access:** http://localhost:8025

---

### Dozzle Service

```yaml
dozzle:
  image: amir20/dozzle:latest
  container_name: entoo_dozzle
  restart: unless-stopped
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock
  ports:
    - "8888:8080"
  networks:
    - entoo_network
```

**Purpose:** Real-time Docker log viewer

**Access:** http://localhost:8888

**Features:**
- View logs from all containers
- Search and filter logs
- Follow logs in real-time
- Multiple container view

---

## 2. Development Mode

### Development Override

**File:** `docker-compose.dev.yml`

**Usage:**
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
# Or use helper script:
dev-start.bat
```

---

### PHP Development Configuration

```yaml
php:
  build:
    context: .
    dockerfile: ./docker/php/Dockerfile.dev
  volumes:
    - ./webapp:/var/www/html
    - ./storage:/var/www/html/storage
    - ./docker/php/php-dev.ini:/usr/local/etc/php/php.ini
    - ./old_entoo:/old_entoo:ro
  command: >
    sh -c "
      php artisan config:clear &&
      php artisan route:clear &&
      php artisan view:clear &&
      php artisan cache:clear &&
      php artisan octane:start --server=swoole --host=0.0.0.0 --port=8000 --watch
    "
  environment:
    - APP_ENV=local
    - APP_DEBUG=true
```

**Key Differences:**
- Uses `Dockerfile.dev` (includes development tools)
- Uses `php-dev.ini` (opcache disabled)
- Clears all caches on startup
- Octane runs with `--watch` flag (hot reload)
- `APP_ENV=local` and `APP_DEBUG=true`

**Dev PHP Settings (`php-dev.ini`):**
```ini
; Disable opcache for development
opcache.enable=0
opcache.enable_cli=0

; Show all errors
display_errors=On
display_startup_errors=On
error_reporting=E_ALL

; Increase limits for development
memory_limit=512M
upload_max_filesize=100M
post_max_size=100M
```

---

## 3. Production Deployment

### Production Checklist

**Before Deployment:**

- [ ] Update environment variables in `.env`
- [ ] Change default passwords (DB, Redis)
- [ ] Set `APP_ENV=production`
- [ ] Set `APP_DEBUG=false`
- [ ] Generate new `APP_KEY`
- [ ] Configure SSL/TLS certificates
- [ ] Set up proper logging
- [ ] Configure backups
- [ ] Set resource limits
- [ ] Enable security features

---

### Environment Variables

**Production `.env`:**
```bash
APP_NAME=Entoo
APP_ENV=production
APP_DEBUG=false
APP_KEY=base64:... # php artisan key:generate
APP_URL=https://entoo.example.com

# Database
DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=entoo
DB_USERNAME=entoo_production_user
DB_PASSWORD=STRONG_PASSWORD_HERE

# Redis
REDIS_HOST=redis
REDIS_PASSWORD=STRONG_REDIS_PASSWORD_HERE
REDIS_PORT=6379
CACHE_DRIVER=redis
QUEUE_CONNECTION=redis

# Elasticsearch
ELASTICSEARCH_HOST=http://elasticsearch:9200
ELASTICSEARCH_INDEX=entoo_documents

# Mail
MAIL_MAILER=smtp
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USERNAME=noreply@example.com
MAIL_PASSWORD=MAIL_PASSWORD_HERE
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@example.com
MAIL_FROM_NAME="${APP_NAME}"

# Sanctum
SANCTUM_STATEFUL_DOMAINS=entoo.example.com
```

---

### SSL/TLS Configuration

**Option 1: Let's Encrypt with Certbot**

1. Install Certbot in Nginx container
2. Generate certificates
3. Update Nginx configuration

**Option 2: Reverse Proxy (Recommended)**

Use Traefik or Nginx Proxy Manager in front of Entoo:

```yaml
# docker-compose.prod.yml
services:
  traefik:
    image: traefik:v2.10
    command:
      - "--providers.docker=true"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@example.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./letsencrypt:/letsencrypt

  nginx:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.entoo.rule=Host(`entoo.example.com`)"
      - "traefik.http.routers.entoo.entrypoints=websecure"
      - "traefik.http.routers.entoo.tls.certresolver=letsencrypt"
```

---

### Resource Limits

**Production docker-compose.yml additions:**

```yaml
services:
  postgres:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G

  elasticsearch:
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 4G
        reservations:
          cpus: '2'
          memory: 2G

  php:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
        reservations:
          cpus: '1'
          memory: 512M
```

---

### Backup Strategy

**Database Backup:**
```bash
#!/bin/bash
# backup-postgres.sh
docker exec entoo_postgres pg_dump -U entoo_user entoo | gzip > backups/entoo_$(date +%Y%m%d_%H%M%S).sql.gz

# Cron: Daily at 2 AM
0 2 * * * /path/to/backup-postgres.sh
```

**Elasticsearch Snapshot:**
```bash
# Create snapshot repository
curl -X PUT "http://localhost:9200/_snapshot/backups" -H 'Content-Type: application/json' -d'
{
  "type": "fs",
  "settings": {
    "location": "/usr/share/elasticsearch/backups"
  }
}
'

# Take snapshot
curl -X PUT "http://localhost:9200/_snapshot/backups/snapshot_$(date +%Y%m%d)"
```

**File Storage Backup:**
```bash
# Rsync uploaded files
rsync -av ./storage/app/uploads/ /backup/uploads/
```

---

## 4. Management Commands

### Starting Services

**Production:**
```bash
docker-compose up -d
```

**Development:**
```bash
dev-start.bat
# Or:
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

---

### Stopping Services

```bash
docker-compose down
```

**With volume removal (⚠️ DATA LOSS):**
```bash
docker-compose down -v
```

---

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f php
docker-compose logs -f queue
docker-compose logs -f nginx

# Last 100 lines
docker-compose logs --tail=100 php
```

---

### Accessing Containers

```bash
# PHP container
docker exec -it php bash
docker exec -it php php artisan tinker

# PostgreSQL
docker exec -it entoo_postgres psql -U entoo_user -d entoo

# Redis
docker exec -it entoo_redis redis-cli
AUTH redis_password

# Queue worker
docker exec -it entoo_queue bash
```

---

### Restarting Services

```bash
# All services
docker-compose restart

# Specific service
docker-compose restart php
docker-compose restart nginx
docker-compose restart queue
```

**When to Restart:**
- After code changes (production)
- After `.env` changes
- After config caching (`php artisan config:cache`)
- After optimization (`php artisan optimize`)

---

### Rebuilding Images

```bash
# Rebuild all images
docker-compose build

# Rebuild specific service
docker-compose build php

# Rebuild without cache
docker-compose build --no-cache php

# Build and start
docker-compose up -d --build
```

**When to Rebuild:**
- After Dockerfile changes
- After installing new PHP extensions
- After dependency updates

---

## 5. Health Checks

### Service Health Status

```bash
# Check all services
docker-compose ps

# Expected output:
# NAME                IMAGE                       STATUS
# entoo_postgres      postgres:15-alpine          Up (healthy)
# entoo_redis         redis:7-alpine              Up (healthy)
# entoo_elasticsearch elasticsearch:8.11.0        Up (healthy)
# php                 entoo-php                   Up
# entoo_nginx         nginx:alpine                Up (healthy)
# entoo_queue         entoo-php                   Up
```

---

### Manual Health Checks

**PostgreSQL:**
```bash
docker exec entoo_postgres pg_isready -U entoo_user -d entoo
# Expected: postgres:5432 - accepting connections
```

**Redis:**
```bash
docker exec entoo_redis redis-cli -a redis_password ping
# Expected: PONG
```

**Elasticsearch:**
```bash
curl http://localhost:9200/_cluster/health
# Expected: {"status":"green",...}
```

**Laravel Application:**
```bash
curl http://localhost:8000/api/health
# Expected: {"status":"healthy",...}
```

---

## 6. Troubleshooting

### Issue: Services Won't Start

**Symptoms:** Containers crash immediately

**Check:**
```bash
docker-compose logs postgres
docker-compose logs redis
docker-compose logs elasticsearch
```

**Common Causes:**
- Port conflicts (another service using 5432, 6379, 9200)
- Insufficient memory (Elasticsearch needs 1GB+)
- Corrupted volumes

**Solution:**
```bash
# Check port usage
netstat -an | grep 5432
netstat -an | grep 6379
netstat -an | grep 9200

# Recreate volumes (⚠️ DATA LOSS)
docker-compose down -v
docker-compose up -d
```

---

### Issue: Elasticsearch Out of Memory

**Symptoms:** Elasticsearch container restarts repeatedly

**Solution:**
```yaml
# Increase heap size in docker-compose.yml
environment:
  - "ES_JAVA_OPTS=-Xms2g -Xmx2g"  # Increased to 2GB
```

**Or adjust Docker Desktop:**
- Settings → Resources → Memory
- Increase to at least 4GB

---

### Issue: Queue Jobs Not Processing

**Symptoms:** Files stuck in 'pending' status

**Check:**
```bash
docker logs entoo_queue
docker exec php php artisan queue:failed
```

**Solution:**
```bash
# Restart queue worker
docker-compose restart queue

# Check for failed jobs
docker exec php php artisan queue:failed

# Retry failed jobs
docker exec php php artisan queue:retry all
```

---

### Issue: Permission Errors

**Symptoms:** "Permission denied" in logs

**Solution:**
```bash
# Fix storage permissions
docker exec php chown -R www-data:www-data storage bootstrap/cache

# On host (if needed)
sudo chown -R $USER:$USER webapp/storage
sudo chmod -R 775 webapp/storage
```

---

### Issue: Changes Not Reflecting

**Symptoms:** Code changes don't appear

**Solution (Production):**
```bash
# Restart PHP container (Octane keeps app in memory)
docker-compose restart php
```

**Solution (Development):**
```bash
# Use dev mode with --watch flag
dev-start.bat
```

---

## 7. Performance Optimization

### Docker Performance Tips

**Windows/Mac:**
- Use named volumes instead of bind mounts for data
- Enable file sharing only for necessary directories
- Use `delegated` or `cached` consistency modes

**Example:**
```yaml
volumes:
  - ./webapp:/var/www/html:delegated  # Better performance on Mac/Windows
```

---

### Resource Allocation

**Recommended Minimums:**
- Docker Desktop: 8GB RAM, 4 CPUs
- PostgreSQL: 1GB RAM
- Redis: 512MB RAM
- Elasticsearch: 2GB RAM (1GB heap)
- PHP: 512MB RAM
- Total: ~5-6GB allocated

---

**Last Updated:** 2025-11-13
**Version:** 1.0
**Maintained By:** Development Team
