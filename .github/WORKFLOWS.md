# GitHub Workflows Documentation

This document provides comprehensive documentation for all GitHub Actions workflows configured in this repository.

## Table of Contents

- [Overview](#overview)
- [Workflows](#workflows)
  - [CI/CD Pipeline](#cicd-pipeline)
  - [CodeQL Security Analysis](#codeql-security-analysis)
  - [Code Quality](#code-quality)
  - [Docker Build & Push](#docker-build--push)
  - [Deployment](#deployment)
  - [Release Management](#release-management)
  - [Performance Monitoring](#performance-monitoring)
  - [Dependabot Auto-Merge](#dependabot-auto-merge)
  - [Stale Issues & PRs](#stale-issues--prs)
  - [Cleanup](#cleanup)
- [Required Secrets](#required-secrets)
- [GitHub Environments](#github-environments)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

Our GitHub Actions setup provides a complete CI/CD pipeline with:

- ✅ Automated testing (PHPUnit, Playwright E2E)
- ✅ Code quality checks (Pint, PHPStan, ESLint)
- ✅ Security scanning (CodeQL, dependency audits)
- ✅ Performance monitoring
- ✅ Automated dependency updates
- ✅ Docker image building and publishing
- ✅ Multi-environment deployment
- ✅ Release automation

## Workflows

### CI/CD Pipeline

**File:** `.github/workflows/ci-cd.yml`

**Triggers:**
- Push to `main`, `develop`, `feature/**` branches
- Pull requests to `main`, `develop`
- Manual trigger with environment selection

**Jobs:**

1. **code-quality** (self-hosted) - Runs Laravel Pint, PHPStan, and checks for anti-patterns
2. **frontend-quality** (ubuntu-latest) - Builds frontend assets, checks for console statements
3. **backend-tests** (self-hosted) - Runs PHPUnit tests with coverage (min 80%)
4. **e2e-tests** (self-hosted) - Runs Playwright E2E tests (performance, caching, PDF parsing)
5. **security-scan-code** (ubuntu-latest) - Scans for secrets and NPM vulnerabilities
6. **security-scan-php** (self-hosted) - Runs Composer dependency audit
7. **build-status** (ubuntu-latest) - Aggregates all results and reports status

**Runner Requirements:**
- **Self-hosted runners** needed for: code-quality, backend-tests, e2e-tests, security-scan-php (require Docker containers)
- **GitHub-hosted runners** used for: frontend-quality, security-scan-code, build-status (no Docker needed)

**Key Features:**
- Parallel job execution for faster feedback
- Comprehensive test coverage requirements
- Security scanning for secrets and vulnerabilities
- Build artifacts uploaded for 30 days

**Usage:**
```bash
# Automatically runs on push/PR
git push origin feature/my-feature

# Manual trigger with specific environment
gh workflow run ci-cd.yml -f environment=staging
```

---

### CodeQL Security Analysis

**File:** `.github/workflows/codeql-analysis.yml`

**Triggers:**
- Push to `main`, `develop`
- Pull requests to `main`, `develop`
- Schedule: Weekly on Mondays at 2 AM UTC
- Manual trigger

**Languages Analyzed:**
- JavaScript

**Note:** PHP is not supported by CodeQL. PHP security analysis is performed by PHPStan in the code-quality workflow.

**Key Features:**
- Advanced security queries
- SARIF upload to GitHub Security tab
- Automated vulnerability detection
- Weekly scheduled scans
- Uses CodeQL Action v4

**Results:** View in Repository → Security → Code scanning alerts (requires enabling code scanning in repository settings)

---

### Code Quality

**File:** `.github/workflows/code-quality.yml`

**Triggers:**
- Pull requests to `main`, `develop`
- Push to `main`, `develop`
- Manual trigger

**Jobs:**

1. **php-quality** (self-hosted)
   - Laravel Pint (code style)
   - PHPStan (static analysis)
   - PHP_CodeSniffer (PSR-12)
   - Code smell detection
   - Complexity analysis

2. **js-quality** (ubuntu-latest)
   - ESLint
   - Console statement detection
   - Bundle size analysis
   - File size checks

3. **docs-quality** (ubuntu-latest)
   - README verification
   - Markdown link checking
   - Spell checking
   - API documentation freshness

4. **quality-score** (ubuntu-latest)
   - Calculates overall score (0-100)
   - Fails if score < 70
   - Warns if score < 90

**Runner Requirements:**
- **Self-hosted runner** needed for: php-quality (requires Docker)
- **GitHub-hosted runners** used for: js-quality, docs-quality, quality-score

**Thresholds:**
- Bundle size: < 5MB
- JavaScript files: < 10KB each
- PHP files: < 500 lines recommended
- Zero debug statements (var_dump, dd, console.log)

---

### Docker Build & Push

**File:** `.github/workflows/docker-build-push.yml`

**Triggers:**
- Push to `main`, `develop`
- Tags matching `v*.*.*`
- Pull requests to `main`
- Manual trigger with push option

**Services Built:**
- PHP (Laravel Octane)
- Nginx

**Registry:** GitHub Container Registry (ghcr.io)

**Features:**
- Multi-architecture support
- Build caching for faster builds
- Vulnerability scanning with Trivy
- Automatic tagging strategy:
  - Branch name
  - PR number
  - Semantic version (from tags)
  - Git SHA
  - `latest` for default branch

**Image Tags:**
```
ghcr.io/<owner>/<repo>/php:main
ghcr.io/<owner>/<repo>/php:v1.2.3
ghcr.io/<owner>/<repo>/php:sha-abc123
ghcr.io/<owner>/<repo>/php:latest
```

**Usage:**
```bash
# Build on tag
git tag v1.0.0
git push origin v1.0.0

# Pull image
docker pull ghcr.io/<owner>/<repo>/php:latest
```

---

### Deployment

**File:** `.github/workflows/deploy.yml`

**Triggers:**
- Manual trigger with environment selection
- Release published

**Environments:**
- Development
- Staging
- Production

**Process:**

1. **Pre-deployment Tests** - Full test suite (can be skipped, not recommended)
2. **Deploy** - SSH deployment to target server
3. **Smoke Tests** - Health check verification
4. **Post-deployment** - CDN cache clearing, notifications

**Deployment Steps:**
1. Create backup
2. Pull latest code
3. Install dependencies
4. Build frontend assets
5. Run migrations
6. Clear and optimize caches
7. Restart services
8. Run smoke tests

**Rollback:** Automatic on failure, restores from backup

**Usage:**
```bash
# Deploy to staging
gh workflow run deploy.yml -f environment=staging -f skip_tests=false

# Deploy to production
gh workflow run deploy.yml -f environment=production
```

---

### Release Management

**File:** `.github/workflows/release.yml`

**Triggers:**
- Tags matching `v*.*.*`
- Manual trigger with version input

**Jobs:**

1. **create-release**
   - Generates changelog from git commits
   - Creates GitHub Release
   - Groups changes by type (features, fixes, chores)
   - Marks pre-releases (alpha, beta, rc)

2. **build-assets**
   - Builds production-ready application
   - Creates .tar.gz and .zip archives
   - Generates SHA256 checksums
   - Uploads to release

3. **deploy-release**
   - Automatically deploys to production
   - Calls deployment workflow

**Changelog Format:**
- Features (feat:)
- Bug Fixes (fix:)
- Maintenance (chore:)
- Other changes

**Usage:**
```bash
# Create release
git tag v1.2.3
git push origin v1.2.3

# Or manual
gh workflow run release.yml -f version=v1.2.3
```

---

### Performance Monitoring

**File:** `.github/workflows/performance-monitoring.yml`

**Triggers:**
- Schedule: Every 6 hours
- Push to `main`
- Manual trigger

**Runner:** self-hosted (requires Docker containers for API tests)

**Metrics Monitored:**

1. **API Benchmarks**
   - `/api/subjects` - Threshold: < 100ms
   - `/api/search` - Threshold: < 200ms
   - Average over 10 requests

2. **Database Performance**
   - Slow query analysis
   - Query execution times
   - Connection pool status

3. **Redis Performance**
   - Operations per second
   - Memory usage
   - Cache hit rate

4. **Elasticsearch Performance**
   - Cluster health
   - Document count
   - Index size

**Alerts:** Triggered when thresholds exceeded

**Note:** Requires Docker containers to be running on self-hosted runner

---

### Dependabot Auto-Merge

**File:** `.github/workflows/dependabot-auto-merge.yml`

**Triggers:**
- Dependabot pull requests

**Auto-Merge Conditions:**
- Minor version updates (1.2.x → 1.3.0)
- Patch version updates (1.2.3 → 1.2.4)

**Manual Review Required:**
- Major version updates (1.x.x → 2.0.0)
- Security-related updates

**Features:**
- Automatic approval for minor/patch updates
- Squash merge with branch deletion
- Comment on major updates with review checklist

---

### Stale Issues & PRs

**File:** `.github/workflows/stale.yml`

**Schedule:** Daily at midnight UTC

**Configuration:**

**Issues:**
- Stale after: 60 days of inactivity
- Closed after: 7 days of being stale
- Exempt labels: `pinned`, `security`, `bug`, `enhancement`

**Pull Requests:**
- Stale after: 30 days of inactivity
- Closed after: 14 days of being stale
- Exempt labels: `pinned`, `work-in-progress`, `blocked`

**Prevention:** Add `pinned` label or comment to keep open

---

### Cleanup

**File:** `.github/workflows/cleanup.yml`

**Schedule:** Weekly on Sundays at 2 AM UTC

**Cleanup Actions:**
- Delete workflow runs older than 30 days (keep minimum 10)
- Delete artifacts older than 30 days (keep recent 5)

**Manual Trigger:** Can specify custom retention period

---

## Required Secrets

Configure these secrets in: Repository → Settings → Secrets and variables → Actions

### Deployment Secrets

| Secret Name | Description | Required For |
|-------------|-------------|--------------|
| `DEV_SERVER_HOST` | Development server hostname/IP | Development deployment |
| `STAGING_SERVER_HOST` | Staging server hostname/IP | Staging deployment |
| `PROD_SERVER_HOST` | Production server hostname/IP | Production deployment |
| `DEPLOY_USER` | SSH username for deployment | All deployments |
| `DEPLOY_SSH_KEY` | SSH private key for authentication | All deployments |
| `DEPLOY_SSH_PORT` | SSH port (default: 22) | All deployments |
| `DEPLOY_PATH` | Application path on server | All deployments |

### Optional Secrets

| Secret Name | Description | Used In |
|-------------|-------------|---------|
| `SLACK_WEBHOOK_URL` | Slack webhook for notifications | Deployment, Performance |
| `DISCORD_WEBHOOK_URL` | Discord webhook for notifications | Deployment, Performance |
| `CDN_API_KEY` | CDN API key for cache clearing | Deployment |

### Auto-Generated Secrets

| Secret Name | Description | Auto-Generated |
|-------------|-------------|----------------|
| `GITHUB_TOKEN` | GitHub API token | Yes, by GitHub |

## GitHub Environments

Create these environments in: Repository → Settings → Environments

### Development Environment

**Name:** `development`

**Protection Rules:**
- ❌ No required reviewers
- ❌ No deployment branches
- ✅ Environment secrets

**URL:** `https://dev.entoo.example.com`

**Secrets:**
- `DEV_SERVER_HOST`
- `DEPLOY_PATH=/var/www/entoo-dev`

---

### Staging Environment

**Name:** `staging`

**Protection Rules:**
- ✅ Required reviewers: 1
- ✅ Deployment branches: `main`, `develop`
- ✅ Environment secrets

**URL:** `https://staging.entoo.example.com`

**Secrets:**
- `STAGING_SERVER_HOST`
- `DEPLOY_PATH=/var/www/entoo-staging`

---

### Production Environment

**Name:** `production`

**Protection Rules:**
- ✅ Required reviewers: 2
- ✅ Deployment branches: `main` only
- ✅ Wait timer: 5 minutes
- ✅ Environment secrets

**URL:** `https://entoo.example.com`

**Secrets:**
- `PROD_SERVER_HOST`
- `DEPLOY_PATH=/var/www/entoo`

## Best Practices

### 1. Branch Strategy

```
main (production)
  ├── develop (staging)
  │   ├── feature/new-feature
  │   ├── feature/another-feature
  │   └── bugfix/fix-issue
  └── hotfix/urgent-fix (direct to main)
```

### 2. Commit Message Format

Follow Conventional Commits:

```
feat: add user authentication
fix: resolve login redirect issue
chore: update dependencies
docs: improve API documentation
test: add E2E tests for checkout
perf: optimize database queries
refactor: restructure user service
```

### 3. Pull Request Workflow

1. Create feature branch
2. Implement changes
3. Push and create PR
4. Wait for CI/CD to pass
5. Request review
6. Merge after approval

### 4. Security Best Practices

- ✅ Never commit secrets to repository
- ✅ Use GitHub Secrets for sensitive data
- ✅ Keep dependencies up to date
- ✅ Review Dependabot PRs promptly
- ✅ Monitor security alerts
- ✅ Run security scans regularly

### 5. Performance Monitoring

- 📊 Check performance dashboard weekly
- 🚨 Investigate threshold violations immediately
- 📈 Track metrics over time
- ⚡ Optimize slow endpoints

## Troubleshooting

### Workflow Fails with "Container not found"

**Issue:** Docker containers not running on self-hosted runner

**Solution:**
```bash
# On runner machine
docker-compose up -d
docker ps  # Verify containers running
```

### Deployment Fails with SSH Error

**Issue:** SSH authentication failed

**Solution:**
1. Verify `DEPLOY_SSH_KEY` is set correctly
2. Ensure key has proper format (include header/footer)
3. Check server firewall allows SSH connections
4. Verify `DEPLOY_USER` has proper permissions

### Tests Timeout

**Issue:** Tests exceed timeout limit

**Solution:**
1. Increase timeout in workflow file
2. Optimize slow tests
3. Check for container health issues

### CodeQL Fails to Analyze

**Issue:** CodeQL analysis errors

**Solution:**
1. Check supported language versions
2. Verify autobuild works
3. Add manual build steps if needed

### Dependabot PRs Not Auto-Merging

**Issue:** PRs remain open despite auto-merge enabled

**Solution:**
1. Check CI/CD passes
2. Verify update type (major requires manual review)
3. Check branch protection rules don't conflict

### Docker Build Runs Out of Space

**Issue:** Insufficient disk space during build

**Solution:**
```bash
# Clean up Docker
docker system prune -af --volumes

# Or configure cleanup workflow to run more frequently
```

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [CodeQL Documentation](https://codeql.github.com/docs/)
- [Self-Hosted Runner Setup](SELF_HOSTED_RUNNER_SETUP.md)
- [Project Documentation](../CLAUDE.md)

## Support

For issues or questions:

1. Check this documentation
2. Review workflow logs in Actions tab
3. Check [Troubleshooting](#troubleshooting) section
4. Create an issue in this repository
