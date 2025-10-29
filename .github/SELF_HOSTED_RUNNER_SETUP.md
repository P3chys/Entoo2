# GitHub Actions Self-Hosted Runner Setup for Windows

This guide explains how to set up the GitHub Actions self-hosted runner on Windows with Docker access.

## Issue

The self-hosted runner needs permission to access Docker on Windows. Without this, you'll see:

```
error during connect: Access is denied to //./pipe/docker_engine
```

## Solution: Grant Docker Access

### Option 1: Add Runner User to docker-users Group (Recommended)

1. **Find the runner user account:**
   - Open Services (`services.msc`)
   - Find "GitHub Actions Runner" service
   - Check what account it's running as (e.g., your Windows username)

2. **Add user to docker-users group:**

   Open PowerShell **as Administrator** and run:

   ```powershell
   # Replace YOUR_USERNAME with the actual runner account
   net localgroup docker-users "YOUR_USERNAME" /add

   # If running as NETWORK SERVICE (common for service accounts):
   net localgroup docker-users "NT AUTHORITY\NETWORK SERVICE" /add
   ```

3. **Restart Docker and Runner:**

   ```powershell
   # Restart Docker Desktop
   Restart-Service com.docker.service

   # Restart GitHub Actions Runner
   # Find the exact service name first:
   Get-Service | Where-Object {$_.Name -like "*actions*"}

   # Then restart it:
   Restart-Service "actions.runner.*"
   ```

4. **Verify access:**

   ```powershell
   # Test Docker access as the runner user
   docker ps
   ```

### Option 2: Run Runner as Administrator

1. Open Services (`services.msc`)
2. Find "GitHub Actions Runner" service
3. Right-click → Properties → Log On tab
4. Select "Local System account" or your admin account
5. Click Apply → OK
6. Restart the service

### Option 3: Run Tests Manually (Temporary)

If you need to verify tests work but don't want to fix permissions yet:

```bash
# From repository root
docker exec php php artisan test

# Run Playwright tests
cd tests
npm install
npx playwright test
```

## Prerequisites for Self-Hosted Runner

Ensure your environment has:

1. **Docker containers running:**
   ```bash
   docker ps
   # Should show: php, nginx, postgres, redis, elasticsearch
   ```

2. **Application accessible:**
   ```bash
   curl http://localhost:8000/api/health
   # Should return 200 OK
   ```

3. **Node.js installed:**
   ```bash
   node --version
   npm --version
   ```

## Workflow Configuration

The simplified workflow for self-hosted runner:

```yaml
jobs:
  test:
    runs-on: self-hosted

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Run PHPUnit tests
      run: docker exec php php artisan test

    - name: Run Playwright tests
      working-directory: ./tests
      run: |
        npm install
        npx playwright test --reporter=list
```

## Troubleshooting

### Error: Container 'php' not found

Your Docker containers aren't running. Start them:

```bash
docker-compose up -d
```

### Error: Docker daemon not running

Start Docker Desktop or Docker service:

```powershell
Start-Service com.docker.service
```

### Tests pass but workflow fails

The runner might be using a different working directory. Check:

```powershell
# In your runner's work directory
cd C:\actions-runner\_work\Entoo2\Entoo2
docker exec php php artisan test
```

## Alternative: Disable Self-Hosted Runner

If you prefer to use GitHub-hosted runners instead:

1. Edit `.github/workflows/laravel-tests.yml`
2. Change `runs-on: self-hosted` to `runs-on: ubuntu-latest`
3. The workflow will use GitHub's infrastructure (slower but no setup needed)

Note: Gzip compression tests will fail on GitHub-hosted runners because they use Octane directly without Nginx.

## Support

For issues with:
- **GitHub Actions Runner**: https://github.com/actions/runner/issues
- **Docker on Windows**: https://docs.docker.com/desktop/windows/troubleshoot/
- **This Repository**: Create an issue in this repo
