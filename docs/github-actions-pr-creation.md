# GitHub Actions Pull Request Creation Setup

This document outlines the complete setup process for enabling GitHub Actions to automatically create pull requests in this repository.

## Overview

Our GitHub Actions workflows can automatically create pull requests when Notion database changes are detected. This requires proper authentication and permission configuration.

## Prerequisites

1. **GitHub Account with Valid Billing**: Ensure your GitHub account has valid payment information configured
2. **Repository Access**: Admin access to the repository where workflows will run
3. **GitHub Actions Enabled**: Verify GitHub Actions are enabled for the repository

## Required Repository Settings

### 1. Enable Workflow Permissions

Navigate to your repository settings:

1. Go to **Settings** → **Actions** → **General**
2. Under **Workflow permissions**, ensure the following is configured:
   - Select **"Read and write permissions"** for GITHUB_TOKEN
   - ✅ **Check** "Allow GitHub Actions to create and approve pull requests"

### 2. Verify Actions are Enabled

In the same **Actions** → **General** section:
- Ensure **"Allow all actions and reusable workflows"** is selected
- Or configure specific allowed actions as needed for your organization

## Workflow Configuration

### Authentication Method

Our workflows use the built-in `GITHUB_TOKEN` with the `GH_TOKEN` environment variable:

```yaml
env:
  GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Required Permissions

Workflows must declare the following permissions:

```yaml
permissions:
  contents: write        # Required for pushing code changes
  pull-requests: write   # Required for creating pull requests
```

### Example Implementation

```yaml
- name: Create pull request
  run: |
    gh pr create \
      --title "Automated Changes" \
      --body "Description of changes" \
      --head "feature-branch" \
      --base "main"
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Troubleshooting

### Common Issues and Solutions

#### 1. "GitHub Actions is not permitted to create or approve pull requests"

**Problem**: Repository settings don't allow PR creation
**Solution**: Enable "Allow GitHub Actions to create and approve pull requests" in repository settings

#### 2. "Invalid workflow file... requesting 'pull-requests: write', but only allowed 'none'"

**Problem**: Insufficient token permissions
**Solution**: Set workflow permissions to "Read and write permissions" in repository settings

#### 3. "Your account's billing is currently locked"

**Problem**: Payment information issues
**Solution**: Update payment information in GitHub account billing settings

#### 4. Authentication failures with gh command

**Problem**: Using `GITHUB_TOKEN` instead of `GH_TOKEN`
**Solution**: Use `GH_TOKEN` environment variable for GitHub CLI authentication

### Verification Steps

1. **Test Workflow Permissions**:
   ```bash
   # Run a simple workflow that attempts to create a PR
   gh workflow run notion-changes-test.yml
   ```

2. **Check Token Permissions**:
   ```bash
   # In workflow, verify token can access PR endpoints
   gh pr list --repo ${{ github.repository }}
   ```

3. **Validate Settings**:
   - Repository Settings → Actions → General
   - Confirm "Allow GitHub Actions to create and approve pull requests" is checked
   - Confirm "Read and write permissions" is selected

## Security Considerations

### Best Practices

1. **Minimum Permissions**: Only grant necessary permissions to workflows
2. **Branch Protection**: Use branch protection rules to require PR reviews
3. **Workflow Isolation**: Separate test and production workflows
4. **Secret Management**: Use repository secrets for sensitive configuration

### Permission Scope

The `GITHUB_TOKEN` automatically scoped to the repository where the workflow runs:
- Cannot access other repositories
- Permissions expire when workflow completes
- Automatically managed by GitHub Actions

## Related Documentation

- [GitHub Actions Authentication](https://docs.github.com/en/actions/security-guides/automatic-token-authentication)
- [Managing Repository Permissions](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features)
- [GitHub CLI in Actions](https://docs.github.com/en/actions/using-workflows/using-github-cli-in-workflows)

## Implementation Status

✅ Repository permissions configured  
✅ Workflow authentication updated to use `GH_TOKEN`  
✅ Payment information verified  
⏳ End-to-end PR creation testing pending  

Last updated: 2025-08-15