# GitHub Actions Testing Guide

> 📋 **Documentation Index**: [← Back to Documentation Index](./README.md)

This guide explains procedures for safely testing GitHub Actions workflows.

## ⚠️ Important Warnings

GitHub Actions testing carries the following risks:
- **Real API calls**: Actual requests are sent to the Notion API
- **Real PR creation**: Success results in actual Pull Request creation
- **Repository operations**: Branches and commits are actually created

## 🧪 Staged Testing Strategy

### Phase 1: Local Testing (act)
```bash
# Ensure Docker is running
docker info

# Dry run execution
act -n workflow_dispatch

# Actual local execution
npm run test:act
```

### Phase 2: Testing on GitHub
```bash
# 1. Use production workflow with dry run
# GitHub UI → Actions → "Notion Changes Detection" → "Run workflow"

# 2. Parameter settings
# - dry_run: true (recommended for testing)
```

### Phase 3: Pre-production Verification
```bash
# In test repository or branch
# Test actual PR creation with dry_run: false
```

## 🛡️ Safe Testing Methods

### 1. Using Production Configuration

**Secrets configuration:**
```
NOTION_API_KEY=<your-notion-api-token>
```

**Database configuration:**
- Configure your production databases in `notion-databases.json`
- Use the `enabled` field to control which databases are monitored

### 2. Utilizing Dry Run Mode

```yaml
# Select dry_run: true when running workflow
# → Skip PR creation, log output only
```

### 3. Permission Restriction

```yaml
permissions:
  contents: read       # Start with minimal permissions
  pull-requests: read  # Add as needed
```

### 4. Execution Frequency Limitation

```yaml
on:
  workflow_dispatch:    # Manual execution only
  # Comment out schedule for testing
```

## 🔍 Testing Checklist

### Phase 1: Basic Operation Verification
- [ ] No syntax errors in workflow file
- [ ] Required Secrets are configured
- [ ] Node.js environment setup succeeds
- [ ] Dependency installation succeeds

### Phase 2: Change Detection Testing
- [ ] Connection to Notion API succeeds
- [ ] Database reading succeeds
- [ ] Report generation succeeds
- [ ] Change detection logic works

### Phase 3: Git Operations Testing
- [ ] Git configuration works correctly
- [ ] Branch creation succeeds
- [ ] File commit succeeds
- [ ] Remote push succeeds

### Phase 4: PR Creation Testing
- [ ] GitHub CLI (gh) is available
- [ ] PR creation permissions are correctly set
- [ ] PR creation succeeds
- [ ] PR content is correctly configured

## 🐛 Common Issues and Solutions

### 1. "NOTION_API_KEY is not set"
```bash
# Set NOTION_API_KEY in:
# GitHub Repository → Settings → Secrets and variables → Actions
```

### 2. "Permission denied" Error
```yaml
# In .github/workflows/notion-changes.yml
permissions:
  contents: write
  pull-requests: write
```

### 3. "No changes detected" Continues
```bash
# Change Notion data for testing
# Or force execution with force_pr: true
```

### 4. Branch Creation Error
```bash
# Delete existing test branches
git push origin --delete test-notion-changes-*
```

## 📊 Log Analysis Methods

### Checking GitHub Actions Logs
```
Repository → Actions → Workflow run → Job → Step
```

### Important Log Points
- Environment variable configuration status
- Notion API call success/failure
- File generation status
- Git operation details
- Error messages and stack traces

## 🚀 Production Deployment

### Production Environment Checklist
- [ ] All test phases have succeeded
- [ ] Test PR creation and deletion completed
- [ ] Production Secrets are configured
- [ ] Schedule execution timing is appropriate
- [ ] Monitoring and notification settings completed

### Production Deploy Steps
1. Configure production databases in notion-databases.json
2. Enable production workflow schedule
3. Manually trigger initial execution
4. Verify execution results and PR content
5. Monitor scheduled execution behavior

## 🔧 Debugging Methods

### Enable Detailed Logging
```yaml
- name: Enable debug logging
  run: |
    echo "ACTIONS_STEP_DEBUG=true" >> $GITHUB_ENV
    echo "ACTIONS_RUNNER_DEBUG=true" >> $GITHUB_ENV
```

### Local Reproduction
```bash
# Run locally with same environment variables
NOTION_API_KEY=$NOTION_API_KEY npm run generate-report
```

### Staged Execution
```bash
# Execute up to specific step for debugging
act -j notion-changes --secret-file .env.local -v
```

## 📚 Reference Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [act Documentation](https://nektosact.com/)
- [GitHub Actions Security Best Practices](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [Notion API Documentation](https://developers.notion.com/)