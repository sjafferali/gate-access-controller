# GitHub Actions Setup Guide

This document provides comprehensive instructions for configuring GitHub Actions CI/CD pipelines for the Gate Access Controller project.

## Overview

The project uses three main GitHub Actions workflows:

1. **`main.yml`** - Full CI/CD pipeline for the main branch
   - Runs comprehensive tests and linting
   - Builds multi-platform Docker images (amd64 + arm64)
   - Pushes images to Docker Hub
   - Only executes on pushes to `main` or version tags

2. **`pr.yml`** - Quick validation for pull requests
   - Fast tests and linting
   - Docker build test (no push)
   - Runs on all PRs to `main` or `develop`

3. **`security.yml`** - Weekly security scans
   - CodeQL static analysis
   - Dependency review
   - Runs weekly on Mondays or on manual trigger

## Required GitHub Secrets

To enable the full CI/CD pipeline, configure the following secrets in your GitHub repository:

### Docker Hub Authentication

**Required for:** Building and pushing Docker images to Docker Hub

#### `DOCKERHUB_USERNAME`
- **Type:** Repository Secret
- **Description:** Your Docker Hub username
- **Example:** `sjafferali`
- **How to obtain:** Your Docker Hub account username
- **Used in:** `main.yml` workflow

#### `DOCKERHUB_TOKEN`
- **Type:** Repository Secret
- **Description:** Docker Hub personal access token
- **How to obtain:**
  1. Log in to [Docker Hub](https://hub.docker.com)
  2. Go to Account Settings → Security
  3. Click "New Access Token"
  4. Name: `github-actions-gate-access-controller`
  5. Permissions: `Read, Write, Delete`
  6. Copy the generated token (you can only see it once)
- **Used in:** `main.yml` workflow

### Optional Secrets

#### `CODECOV_TOKEN`
- **Type:** Repository Secret
- **Description:** Codecov upload token for code coverage reports
- **How to obtain:**
  1. Sign up at [codecov.io](https://codecov.io) with your GitHub account
  2. Add your repository
  3. Copy the upload token from repository settings
- **Used in:** `main.yml` workflow
- **Note:** Optional - workflow will continue if not set (uses `continue-on-error: true`)

## Setting Up GitHub Secrets

### Via GitHub Web UI

1. Navigate to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret:
   - Name: `DOCKERHUB_USERNAME`
   - Value: (your Docker Hub username)
   - Click **Add secret**
5. Repeat for `DOCKERHUB_TOKEN` and optional secrets

### Via GitHub CLI

```bash
# Set Docker Hub credentials
gh secret set DOCKERHUB_USERNAME --body "your-docker-hub-username"
gh secret set DOCKERHUB_TOKEN --body "your-docker-hub-token"

# Set Codecov token (optional)
gh secret set CODECOV_TOKEN --body "your-codecov-token"
```

## Docker Hub Repository Setup

### 1. Create Docker Hub Repository

Before running the workflow, create a repository on Docker Hub:

```bash
# Via Docker Hub Web UI:
# 1. Log in to hub.docker.com
# 2. Click "Create Repository"
# 3. Name: gate-access-controller (or your-username/gate-access-controller)
# 4. Visibility: Public or Private
# 5. Click "Create"

# Or via Docker CLI (requires docker login):
docker login
# Repository will be auto-created on first push
```

### 2. Update Repository Name in Workflow

If your Docker Hub repository name differs from your GitHub repository name, update the `IMAGE_NAME` in `.github/workflows/main.yml`:

```yaml
env:
  REGISTRY: docker.io
  IMAGE_NAME: your-dockerhub-username/gate-access-controller  # Update this
```

Default behavior uses `${{ github.repository }}` which resolves to `github-username/repository-name`.

## Environment Variables

The workflows use the following environment variables (no configuration needed):

### Workflow Environment Variables

```yaml
REGISTRY: docker.io                    # Docker registry
IMAGE_NAME: ${{ github.repository }}   # Auto-resolves to owner/repo
```

### Test Environment Variables

```yaml
DATABASE_URL: postgresql://test_user:test_password@localhost:5432/test_gate_access
TESTING: "true"
```

These are automatically set in the workflow for test jobs with PostgreSQL service containers.

## Docker Image Tags

The workflow automatically tags images based on the trigger:

### Main Branch Push
```
your-username/gate-access-controller:latest
your-username/gate-access-controller:main
your-username/gate-access-controller:main-abc1234 (short SHA)
```

### Version Tag Push (e.g., `v1.2.3`)
```
your-username/gate-access-controller:v1.2.3
your-username/gate-access-controller:1.2.3
your-username/gate-access-controller:1.2
your-username/gate-access-controller:1
your-username/gate-access-controller:latest
```

## Multi-Platform Builds

The workflow builds Docker images for multiple platforms:

- **linux/amd64** - x86_64 architecture (most cloud servers, Intel/AMD processors)
- **linux/arm64** - ARM64 architecture (Apple Silicon, AWS Graviton, Raspberry Pi 4+)

This ensures the image works on various deployment targets without modification.

## Workflow Triggers

### Main Workflow (`main.yml`)
```yaml
# Triggers on:
- Push to main branch
- Push of version tags (v*)

# Example commands:
git push origin main                    # Triggers build and push
git tag v1.0.0 && git push origin v1.0.0  # Triggers versioned release
```

### PR Workflow (`pr.yml`)
```yaml
# Triggers on:
- Pull requests to main
- Pull requests to develop

# Example:
# Creating any PR to main will trigger validation
```

### Security Workflow (`security.yml`)
```yaml
# Triggers on:
- Weekly schedule (Monday 00:00 UTC)
- Manual workflow dispatch

# Manual trigger:
# Go to Actions → Security Scanning → Run workflow
```

## Testing Locally

### Test Backend
```bash
# Install dependencies
poetry install --with dev

# Run tests
poetry run pytest

# Run with coverage
poetry run pytest --cov=backend/app --cov-report=term
```

### Test Frontend
```bash
cd frontend

# Install dependencies
npm ci

# Type check
npm run type-check

# Lint
npm run lint

# Build
npm run build
```

### Test Docker Build
```bash
# Build the image
docker build -t gate-access-controller:local .

# Run the container
docker run -p 8080:8080 \
  -e DATABASE_URL=postgresql://user:pass@host/db \
  gate-access-controller:local
```

## Troubleshooting

### Build Fails: "Authentication Required"

**Problem:** Docker build fails with authentication error

**Solution:**
```bash
# Verify secrets are set
gh secret list

# Ensure DOCKERHUB_USERNAME and DOCKERHUB_TOKEN are present
# Re-create token if expired
```

### Build Fails: "Repository Does Not Exist"

**Problem:** Cannot push to Docker Hub repository

**Solution:**
```bash
# Create repository on Docker Hub first
# Or update IMAGE_NAME in workflow to match existing repository
```

### Tests Fail: "Database Connection Error"

**Problem:** Backend tests can't connect to PostgreSQL

**Solution:**
- Check GitHub Actions service container configuration
- Verify `DATABASE_URL` environment variable in workflow
- Ensure tests use `TESTING=true` environment variable

### Multi-Platform Build Slow

**Problem:** ARM64 builds take very long

**Solution:**
- This is expected for cross-platform builds using QEMU emulation
- Builds are cached to speed up subsequent runs
- Consider disabling ARM64 if not needed:
  ```yaml
  strategy:
    matrix:
      platform:
        - linux/amd64
        # - linux/arm64  # Comment out to disable
  ```

### Coverage Upload Fails

**Problem:** Codecov upload fails

**Solution:**
- Verify `CODECOV_TOKEN` is set correctly
- This is marked as `continue-on-error: true` so it won't fail the build
- Check Codecov status at https://codecov.io

## Monitoring Workflow Runs

### View Workflow Status
```bash
# Via GitHub CLI
gh run list --workflow=main.yml

# View specific run
gh run view <run-id>

# Watch live run
gh run watch
```

### Via GitHub Web UI
1. Navigate to your repository
2. Click **Actions** tab
3. Select workflow from left sidebar
4. Click on specific run to view details

## Security Considerations

### Secret Rotation

Rotate Docker Hub tokens periodically (recommended: every 90 days):

```bash
# 1. Create new token on Docker Hub
# 2. Update GitHub secret
gh secret set DOCKERHUB_TOKEN --body "new-token-value"

# 3. Revoke old token on Docker Hub
```

### Permissions

The workflows use minimal required permissions:

```yaml
permissions:
  contents: read        # Read repository code
  packages: write       # Push Docker images
  security-events: write  # Upload security scan results
```

### Dependabot

Automated dependency updates are configured in `.github/dependabot.yml`:
- Weekly updates for Python, npm, GitHub Actions, Docker
- Automatic PR creation with security patches
- Review and merge promptly

## Next Steps

1. **Set up secrets** as documented above
2. **Create Docker Hub repository** for your images
3. **Push to main** to trigger first build
4. **Monitor workflow run** in GitHub Actions tab
5. **Verify Docker image** is pushed to Docker Hub
6. **Test deployment** using the pushed image

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Hub Documentation](https://docs.docker.com/docker-hub/)
- [GitHub Secrets Management](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Multi-Platform Builds](https://docs.docker.com/build/building/multi-platform/)
