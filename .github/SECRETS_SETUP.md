# GitHub Secrets Setup Guide

This guide walks you through setting up all required secrets and environment variables for the GitHub Actions workflows.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Repository Secrets](#repository-secrets)
- [Environment Setup](#environment-setup)
- [SSH Key Generation](#ssh-key-generation)
- [Verification](#verification)
- [Security Best Practices](#security-best-practices)

## Prerequisites

- Repository admin access
- SSH access to deployment servers
- Development, Staging, and Production environments ready

## Repository Secrets

### Step 1: Navigate to Secrets

1. Go to your repository on GitHub
2. Click **Settings** tab
3. Click **Secrets and variables** → **Actions**
4. Click **New repository secret**

### Step 2: Add Deployment Secrets

Add each of the following secrets:

#### SSH Deployment User

**Name:** `DEPLOY_USER`
**Value:** Your SSH username (e.g., `deployer`, `ubuntu`, `www-data`)

```bash
# Recommended: Create dedicated deployment user
sudo useradd -m -s /bin/bash deployer
sudo usermod -aG docker deployer
```

#### SSH Private Key

**Name:** `DEPLOY_SSH_KEY`
**Value:** Your SSH private key

**Generate new SSH key:**
```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy

# Copy private key content
cat ~/.ssh/github_deploy
# Paste entire content including:
# -----BEGIN OPENSSH PRIVATE KEY-----
# ... key content ...
# -----END OPENSSH PRIVATE KEY-----

# Copy public key to servers
ssh-copy-id -i ~/.ssh/github_deploy.pub deployer@dev.entoo.example.com
ssh-copy-id -i ~/.ssh/github_deploy.pub deployer@staging.entoo.example.com
ssh-copy-id -i ~/.ssh/github_deploy.pub deployer@prod.entoo.example.com
```

#### SSH Port (Optional)

**Name:** `DEPLOY_SSH_PORT`
**Value:** `22` (or your custom SSH port)

**Note:** If using default port 22, this secret is not required.

#### Deployment Path

**Name:** `DEPLOY_PATH`
**Value:** Application directory path on server

**Example:**
- Development: `/var/www/entoo-dev`
- Staging: `/var/www/entoo-staging`
- Production: `/var/www/entoo`

```bash
# On each server, create the directory
sudo mkdir -p /var/www/entoo
sudo chown deployer:deployer /var/www/entoo
```

#### Server Hostnames

**Development Server:**
- **Name:** `DEV_SERVER_HOST`
- **Value:** `dev.entoo.example.com` or IP address

**Staging Server:**
- **Name:** `STAGING_SERVER_HOST`
- **Value:** `staging.entoo.example.com` or IP address

**Production Server:**
- **Name:** `PROD_SERVER_HOST`
- **Value:** `entoo.example.com` or IP address

### Step 3: Add Optional Notification Secrets

#### Slack Notifications

**Name:** `SLACK_WEBHOOK_URL`
**Value:** Your Slack webhook URL

**Setup:**
1. Go to https://api.slack.com/apps
2. Create new app or select existing
3. Enable Incoming Webhooks
4. Create webhook for your channel
5. Copy webhook URL

**Example URL:**
```
https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
```

#### Discord Notifications

**Name:** `DISCORD_WEBHOOK_URL`
**Value:** Your Discord webhook URL

**Setup:**
1. Open Discord server settings
2. Go to Integrations → Webhooks
3. Create new webhook
4. Copy webhook URL

**Example URL:**
```
https://discord.com/api/webhooks/123456789/abcdefghijklmnopqrstuvwxyz
```

#### CDN Cache Clearing

**Name:** `CDN_API_KEY`
**Value:** Your CDN API key (Cloudflare, AWS CloudFront, etc.)

**Cloudflare Example:**
1. Log in to Cloudflare dashboard
2. Go to My Profile → API Tokens
3. Create Token → Edit Zone → Cache Purge
4. Copy API token

## Environment Setup

### Step 1: Create Environments

1. Go to Repository **Settings** → **Environments**
2. Click **New environment**

### Step 2: Development Environment

**Name:** `development`

**Configuration:**
- ✅ No protection rules needed
- ✅ Add environment-specific secrets:

| Secret Name | Value |
|-------------|-------|
| `SERVER_HOST` | `dev.entoo.example.com` |
| `DEPLOY_PATH` | `/var/www/entoo-dev` |

### Step 3: Staging Environment

**Name:** `staging`

**Configuration:**
- ✅ **Required reviewers:** Add 1 reviewer
- ✅ **Deployment branches:** Add `main`, `develop`
- ✅ Add environment-specific secrets:

| Secret Name | Value |
|-------------|-------|
| `SERVER_HOST` | `staging.entoo.example.com` |
| `DEPLOY_PATH` | `/var/www/entoo-staging` |

### Step 4: Production Environment

**Name:** `production`

**Configuration:**
- ✅ **Required reviewers:** Add 2 reviewers
- ✅ **Deployment branches:** Add `main` only
- ✅ **Wait timer:** 5 minutes (recommended)
- ✅ Add environment-specific secrets:

| Secret Name | Value |
|-------------|-------|
| `SERVER_HOST` | `entoo.example.com` |
| `DEPLOY_PATH` | `/var/www/entoo` |

## SSH Key Generation

### Recommended: ED25519 Key

```bash
# Generate new key pair
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy

# Set proper permissions
chmod 600 ~/.ssh/github_deploy
chmod 644 ~/.ssh/github_deploy.pub
```

### Alternative: RSA Key (if ED25519 not supported)

```bash
# Generate RSA 4096-bit key
ssh-keygen -t rsa -b 4096 -C "github-actions-deploy" -f ~/.ssh/github_deploy
```

### Deploy Public Key to Servers

**Option 1: ssh-copy-id**
```bash
ssh-copy-id -i ~/.ssh/github_deploy.pub deployer@dev.entoo.example.com
```

**Option 2: Manual**
```bash
# Copy public key content
cat ~/.ssh/github_deploy.pub

# On server, add to authorized_keys
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "PASTE_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### Test SSH Connection

```bash
# Test with private key
ssh -i ~/.ssh/github_deploy deployer@dev.entoo.example.com

# If successful, add private key to GitHub Secrets
cat ~/.ssh/github_deploy
```

## Verification

### Test Deployment Secrets

```bash
# Clone the private key test workflow
gh workflow run ci-cd.yml --ref main

# Or manually test SSH connection
ssh -i ~/.ssh/github_deploy $DEPLOY_USER@$DEV_SERVER_HOST "echo 'Connection successful'"
```

### Verify Environment Access

1. Go to **Actions** tab
2. Run deployment workflow manually
3. Select environment to test
4. Check workflow logs for any errors

### Check Secret Visibility

```bash
# Using GitHub CLI
gh secret list

# Should show all configured secrets (values hidden)
```

## Security Best Practices

### 1. Use Dedicated Deployment Keys

✅ **DO:**
- Create separate SSH keys for GitHub Actions
- Use dedicated deployment user account
- Limit key permissions on server

❌ **DON'T:**
- Use your personal SSH key
- Use root user for deployments
- Share keys across multiple projects

### 2. Rotate Secrets Regularly

```bash
# Rotate SSH keys every 90 days
ssh-keygen -t ed25519 -C "github-actions-deploy-$(date +%Y%m)" -f ~/.ssh/github_deploy_new

# Update authorized_keys on servers
# Update GitHub secret DEPLOY_SSH_KEY
# Remove old key after verification
```

### 3. Use Environment-Specific Secrets

✅ **DO:**
- Store production secrets in production environment only
- Use different credentials for dev/staging/prod

❌ **DON'T:**
- Use same credentials across environments
- Store production secrets as repository secrets

### 4. Enable Audit Logging

1. Go to Repository **Settings** → **Code security and analysis**
2. Enable **Audit log**
3. Review regularly for unauthorized access

### 5. Least Privilege Principle

**Server Permissions:**
```bash
# Deployment user should only access deployment directory
sudo chown -R deployer:deployer /var/www/entoo
sudo chmod -R 755 /var/www/entoo

# Deny other access
sudo usermod -s /bin/bash deployer  # Allow shell
sudo usermod -d /var/www/entoo deployer  # Set home directory
```

### 6. Enable Two-Factor Authentication

1. Enable 2FA on your GitHub account
2. Require 2FA for all organization members
3. Use hardware security keys when possible

### 7. Monitor Secret Usage

```bash
# Check workflow runs for secret access
gh run list --workflow=deploy.yml --limit 10

# Review audit logs
gh api /repos/:owner/:repo/events --paginate | jq '.[] | select(.type == "DeploymentEvent")'
```

## Troubleshooting

### SSH Connection Fails

**Error:** `Permission denied (publickey)`

**Solutions:**
```bash
# 1. Verify public key on server
cat ~/.ssh/authorized_keys

# 2. Check SSH key format in secret
# Must include headers:
# -----BEGIN OPENSSH PRIVATE KEY-----
# -----END OPENSSH PRIVATE KEY-----

# 3. Test connection manually
ssh -vvv -i ~/.ssh/github_deploy deployer@server

# 4. Check server SSH config
sudo cat /etc/ssh/sshd_config | grep -i pubkey
# Should show: PubkeyAuthentication yes
```

### Secret Not Found

**Error:** `Secret DEPLOY_SSH_KEY not found`

**Solutions:**
1. Verify secret name matches exactly (case-sensitive)
2. Check secret is in correct scope (repository vs environment)
3. Refresh repository secrets cache

### Wrong Environment Selected

**Error:** Deployment goes to wrong server

**Solutions:**
1. Verify environment secrets override repository secrets
2. Check workflow environment field
3. Verify environment name matches exactly

### Permission Denied on Server

**Error:** `Permission denied: /var/www/entoo`

**Solutions:**
```bash
# On server, fix permissions
sudo chown -R deployer:deployer /var/www/entoo
sudo chmod -R 755 /var/www/entoo

# Grant deployer docker access
sudo usermod -aG docker deployer

# Verify
sudo -u deployer ls -la /var/www/entoo
sudo -u deployer docker ps
```

## Complete Setup Checklist

- [ ] Generate SSH key pair
- [ ] Deploy public key to all servers
- [ ] Test SSH connection to each server
- [ ] Add `DEPLOY_USER` secret
- [ ] Add `DEPLOY_SSH_KEY` secret
- [ ] Add `DEPLOY_SSH_PORT` secret (if not 22)
- [ ] Add server host secrets (DEV, STAGING, PROD)
- [ ] Add `DEPLOY_PATH` secret
- [ ] Create development environment
- [ ] Create staging environment with 1 reviewer
- [ ] Create production environment with 2 reviewers
- [ ] Add environment-specific secrets
- [ ] Test deployment workflow for each environment
- [ ] Add optional notification secrets (Slack, Discord)
- [ ] Enable audit logging
- [ ] Document secret rotation schedule
- [ ] Train team on secret security practices

## Additional Resources

- [GitHub Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [GitHub Environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [SSH Key Generation](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent)
- [Deployment Best Practices](https://docs.github.com/en/actions/deployment/about-deployments/deploying-with-github-actions)

## Support

If you encounter issues:

1. Check [Troubleshooting](#troubleshooting) section
2. Review workflow logs in Actions tab
3. Verify all secrets are configured correctly
4. Test SSH connection manually
5. Create an issue in the repository
