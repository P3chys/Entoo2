# GitHub Configuration

This directory contains all GitHub-related configuration files for the Entoo project.

## 📁 Directory Structure

```
.github/
├── workflows/              # GitHub Actions workflows
│   ├── ci-cd.yml          # Main CI/CD pipeline
│   ├── codeql-analysis.yml # Security code scanning
│   ├── code-quality.yml   # Code quality checks
│   ├── docker-build-push.yml # Docker image builds
│   ├── deploy.yml         # Deployment automation
│   ├── release.yml        # Release management
│   ├── performance-monitoring.yml # Performance tests
│   ├── dependabot-auto-merge.yml  # Auto-merge dependencies
│   ├── stale.yml          # Stale issue management
│   └── cleanup.yml        # Workflow cleanup
│
├── dependabot.yml         # Dependency update configuration
├── pull_request_template.md # PR template
├── markdown-link-check-config.json # Link checking config
├── spellcheck-config.yml  # Spell check configuration
├── wordlist.txt           # Custom dictionary
│
├── WORKFLOWS.md           # Comprehensive workflow documentation
├── SECRETS_SETUP.md       # Secret configuration guide
├── SELF_HOSTED_RUNNER_SETUP.md # Self-hosted runner guide
└── README.md              # This file
```

## 🚀 Quick Start

### For New Contributors

1. **Read the Documentation**
   - [WORKFLOWS.md](WORKFLOWS.md) - Understanding our CI/CD pipeline
   - [Pull Request Template](pull_request_template.md) - PR guidelines

2. **Local Development**
   ```bash
   # Clone the repository
   git clone https://github.com/your-org/Entoo2.git
   cd Entoo2

   # Start development environment
   dev-start.bat

   # Run tests locally
   docker exec php php artisan test
   cd tests && npm test
   ```

3. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **Make Changes & Test**
   - Write code
   - Add tests
   - Run linters: `docker exec php ./vendor/bin/pint`
   - Run tests: `docker exec php php artisan test`

5. **Create Pull Request**
   - Push your branch
   - Open PR (template auto-fills)
   - Wait for CI/CD to pass
   - Request review

### For Repository Administrators

1. **Initial Setup**
   - Read [SECRETS_SETUP.md](SECRETS_SETUP.md)
   - Configure required secrets
   - Set up environments (dev, staging, prod)
   - Configure self-hosted runner (if needed)

2. **Configure Dependabot**
   - Edit [dependabot.yml](dependabot.yml)
   - Set review/assignee preferences
   - Configure auto-merge rules

3. **Customize Workflows**
   - Modify workflow files in `workflows/`
   - Update thresholds and configurations
   - Test changes on feature branch first

## 📊 Workflows Overview

### Continuous Integration

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| **CI/CD Pipeline** | Push, PR | Runs tests, linting, security scans |
| **Code Quality** | PR | Analyzes code quality and complexity |
| **CodeQL Analysis** | Push, Schedule | Security vulnerability scanning |

### Deployment & Release

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| **Deploy** | Manual, Release | Deploys to dev/staging/prod |
| **Release** | Git Tag | Creates releases with changelogs |
| **Docker Build & Push** | Push, Tag | Builds and publishes Docker images |

### Monitoring & Maintenance

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| **Performance Monitoring** | Schedule (6h) | Tracks API performance metrics |
| **Stale Issues** | Daily | Manages inactive issues/PRs |
| **Cleanup** | Weekly | Removes old workflow runs |
| **Dependabot Auto-Merge** | Dependabot PR | Auto-merges minor/patch updates |

## 🔒 Security Features

- ✅ CodeQL security scanning (JavaScript, PHP)
- ✅ Dependency vulnerability audits
- ✅ Secret scanning
- ✅ Docker image vulnerability scanning (Trivy)
- ✅ Encrypted secrets for sensitive data
- ✅ Environment-based access controls

## 📈 Metrics & Reporting

All workflows generate comprehensive reports:

- **Test Coverage** - Minimum 80% required
- **Code Quality Score** - 70/100 minimum
- **Performance Benchmarks** - API response times
- **Build Status** - Success/failure tracking
- **Security Alerts** - Vulnerability notifications

Access reports in:
- Actions tab → Workflow run → Summary
- Security tab → Code scanning alerts
- Pull Request checks

## 🔧 Configuration Files

### dependabot.yml

Manages automatic dependency updates for:
- Composer (PHP)
- NPM (Frontend & Tests)
- Docker images
- GitHub Actions

**Update Schedule:** Weekly on Mondays at 9 AM

### Pull Request Template

Automatically populates new PRs with:
- Summary section
- Changes checklist
- Performance impact
- Test results
- Deployment notes

### Code Quality Configs

- **markdown-link-check-config.json** - Link validation
- **spellcheck-config.yml** - Spell checking rules
- **wordlist.txt** - Project-specific terms

## 🎯 Best Practices

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add user authentication
fix: resolve login redirect issue
docs: update API documentation
test: add E2E tests for checkout
perf: optimize database queries
```

### Branch Naming

```
feature/description    # New features
bugfix/description    # Bug fixes
hotfix/description    # Urgent production fixes
chore/description     # Maintenance tasks
```

### Pull Requests

- ✅ Fill out PR template completely
- ✅ Ensure all CI checks pass
- ✅ Request review from team
- ✅ Address review comments
- ✅ Squash commits before merging

### Testing

- ✅ Write tests for new features
- ✅ Maintain 80%+ code coverage
- ✅ Run tests locally before pushing
- ✅ Add E2E tests for UI changes

## 🚨 Troubleshooting

### CI/CD Failures

**Linting errors:**
```bash
# Auto-fix with Pint
docker exec php ./vendor/bin/pint
```

**Test failures:**
```bash
# Run tests locally with verbose output
docker exec php php artisan test --verbose
```

**Docker build failures:**
```bash
# Clean Docker cache
docker system prune -af
docker-compose build --no-cache
```

### Workflow Issues

- Check [WORKFLOWS.md](WORKFLOWS.md) for detailed documentation
- Review workflow logs in Actions tab
- Verify secrets are configured correctly
- Check self-hosted runner status

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [WORKFLOWS.md](WORKFLOWS.md) | Complete workflow documentation |
| [SECRETS_SETUP.md](SECRETS_SETUP.md) | Secret configuration guide |
| [SELF_HOSTED_RUNNER_SETUP.md](SELF_HOSTED_RUNNER_SETUP.md) | Runner setup instructions |
| [../CLAUDE.md](../CLAUDE.md) | Project development guide |

## 🤝 Contributing

1. Read the documentation
2. Follow coding standards
3. Write comprehensive tests
4. Submit detailed PRs
5. Respond to reviews

## 📞 Support

- **Issues:** Create GitHub issue
- **Security:** See SECURITY.md (if available)
- **Questions:** Tag maintainers in PR/issue

## 🔄 Changelog

### Version 2.0 (Current)

**New Workflows:**
- ✨ Enhanced CI/CD pipeline with parallel jobs
- ✨ CodeQL security scanning
- ✨ Performance monitoring
- ✨ Automated deployments
- ✨ Release automation
- ✨ Dependabot auto-merge

**Improvements:**
- 🚀 Faster build times with caching
- 🔒 Enhanced security scanning
- 📊 Better reporting and metrics
- 🎯 Quality score calculation
- 🔧 Automated cleanup tasks

**Documentation:**
- 📖 Comprehensive workflow docs
- 🔐 Detailed secrets setup guide
- 🎓 Troubleshooting guides

---

**Maintained by:** Entoo Development Team

**Last Updated:** 2025-11-28 (Workflow test trigger)
