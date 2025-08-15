# GitHub Actions Setup Guide

> 📋 **Documentation Index**: [← Back to Documentation Index](./README.md)

This guide explains how to set up automated Notion change detection using GitHub Actions.

## Prerequisites

1. GitHub repository is already created
2. Notion API integration token is obtained
3. `notion-databases.json` is configured

## Setup Steps

### 1. Configure Secrets

Add the following secrets in GitHub Repository → Settings → Secrets and variables → Actions:

#### Required Secrets
- `NOTION_API_KEY`: Notion API integration token
  - Create at Notion Integration settings page (https://www.notion.so/my-integrations)
  - Requires read access to the databases

#### Optional Secrets
- `GITHUB_TOKEN`: Automatically provided, usually no configuration needed

### 2. Verify Workflow File

Ensure `.github/workflows/notion-changes.yml` exists and contains the following configuration:

```yaml
name: Notion Changes Detection

on:
  schedule:
    - cron: '0 0,9 * * *'  # Daily at 9:00 AM and 6:00 PM JST
  workflow_dispatch:
    inputs:
      force_pr:
        description: 'Create PR even if no changes detected'
        type: boolean
        default: false
```

### 3. Permission Settings

The workflow is configured with the following permissions:

```yaml
permissions:
  contents: write      # Branch creation and commits
  pull-requests: write # PR creation
```

### 4. Testing

#### Manual Execution Test
1. Go to the Actions tab
2. Select "Notion Changes Detection" workflow
3. Click "Run workflow"
4. Enable `force_pr` if needed
5. Execute with "Run workflow"

#### Verify Results
- Check each step in the workflow execution logs
- If changes are detected, a Pull Request is automatically created
- If no changes, it ends with "No changes detected"

## Workflow Operations

### Scheduled Execution
- **Schedule**: Daily at 9:00 AM and 6:00 PM JST (0:00 and 9:00 UTC)
- **Change Detection**: Checks configured Notion databases
- **PR Creation**: Only when changes are detected

### Execution Flow
1. **Environment Validation**: Check NOTION_API_KEY existence
2. **Change Detection**: Check Notion API with `npm run generate-report`
3. **Change Evaluation**: Check for new report files
4. **Duplicate Prevention**: Check existing PRs
5. **PR Creation**: Branch creation → Commit → PR creation

## Customization

### Schedule Changes
Edit the `cron` setting in `.github/workflows/notion-changes.yml`:

```yaml
schedule:
  - cron: '0 6,18 * * *'  # Change to 3:00 PM and 3:00 AM JST
```

### Branch Name Changes
Edit the `Generate branch name` step:

```yaml
BRANCH_NAME="custom-notion-changes-${TIMESTAMP}"
```

### PR Content Customization
Edit the `PR_BODY` variable in the `Create pull request` step

## Troubleshooting

### Common Errors

#### 1. "NOTION_API_KEY is not set"
**Cause**: NOTION_API_KEY not configured in Secrets
**Solution**: Add NOTION_API_KEY in repository Secrets settings

#### 2. "Notion API Error: unauthorized"
**Cause**: 
- Invalid API token
- No database access permissions
**Solution**: 
- Generate a new API token
- Add integration to database in Notion

#### 3. "No changes detected" continues
**Cause**:
- Report generation logic issues
- File timestamp issues
**Solution**:
- Manually run `npm run generate-report` to test
- Force execution with `force_pr` option

#### 4. PR creation fails
**Cause**:
- Conflict with existing branches
- Insufficient permissions
**Solution**:
- Delete existing notion-changes branches
- Verify workflow permissions

### Log Analysis
Check workflow execution logs in the Actions tab:
- Detailed logs for each step
- Error messages
- Environment variable status (redacted)

### Debug Execution
You can create a PR even without changes by setting `force_pr: true` in `workflow_dispatch`.

## Security Considerations

1. **API Tokens**: Managed by GitHub Secrets, not displayed in logs
2. **Permissions**: Only minimum required permissions set
3. **Branch Protection**: No direct commits to main branch
4. **Review**: Automatically created PRs require human review

## Maintenance

### Regular Check Items
- [ ] Notion API token validity (usually indefinite)
- [ ] Database configuration changes
- [ ] Workflow execution status
- [ ] Generated report quality

### Updates
1. Deploy new workflow files
2. Test with manual execution
3. Verify scheduled execution behavior

## Related Links

- [Notion API documentation](https://developers.notion.com/)
- [GitHub Actions documentation](https://docs.github.com/en/actions)
- [Local Testing with Act](./local-testing-with-act.md)