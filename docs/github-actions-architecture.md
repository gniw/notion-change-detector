# GitHub Actions Automation Architecture

> 📋 **Documentation Index**: [← Back to Documentation Index](./README.md)

## Overview
Architecture specification document for a workflow that runs Notion change detection scripts periodically with GitHub Actions and automatically creates PRs when changes are detected.

## Requirements Definition

### Functional Requirements
1. **Scheduled Execution**
   - Periodically check Notion changes with GitHub Actions Scheduled execution
   - Automatically create PR when changes are detected
   - Do not create PR when no changes

2. **Manual Execution**
   - On-demand execution with workflow_dispatch trigger
   - Immediate execution capability for debugging purposes

3. **Automatic PR Creation**
   - Create new branch when changes detected
   - Commit generated Markdown reports
   - Automatically create PR with appropriate title and description

4. **Local Verification**
   - Ability to verify workflow locally using act

### Non-Functional Requirements
1. **Security**
   - Notion API key managed by GitHub Secrets
   - Token permissions set with principle of least privilege

2. **Reliability**
   - Appropriate error handling on execution failure
   - Duplicate PR creation prevention

3. **Maintainability**
   - Externalization of configuration values (execution intervals, branch name patterns, etc.)
   - Execution status visibility through log output

## Specification Design

### 1. Workflow Triggers
```yaml
# Scheduled execution: Daily at 9:00 AM and 6:00 PM JST
- cron: '0 0,9 * * *'  # Specified in UTC time

# Manual execution
- workflow_dispatch:
    inputs:
      force_pr:
        description: 'Create PR even if no changes'
        type: boolean
        default: false
```

### 2. Execution Environment
- **Runner**: `ubuntu-latest`
- **Node.js**: Version 18 or higher
- **Required permissions**: `contents: write`, `pull-requests: write`

### 3. Execution Flow
1. **Environment Setup**
   - Node.js setup
   - Dependency installation
   - Environment variable configuration

2. **Notion Change Check**
   - Execute existing script (`npm run generate-report`)
   - Determine change detection results

3. **PR Creation Decision**
   - If changes exist → Go to PR creation flow
   - If no changes → Exit (exception when force_pr is enabled)

4. **PR Creation Flow**
   - Generate unique branch name (e.g., `notion-changes-YYYY-MM-DD-HHMMSS`)
   - Create and checkout new branch
   - Commit generated report files
   - Create PR (using GitHub CLI)

### 4. Branch & Commit Strategy
```
Branch name: notion-changes-{timestamp}
Commit message: feat: add automated Notion changes report for {date}

PR Title: 📊 Notion Changes Report - {date}
PR Body: 
- Automatically generated Notion change report
- Summary of detected change count
- Link to report files
```

### 5. Required Environment Variables & Secrets
```yaml
secrets:
  NOTION_API_KEY: Notion API integration token
  GITHUB_TOKEN: For PR creation (automatically provided)

vars:
  REPORT_SCHEDULE_CRON: Execution schedule (for default value override)
  DEFAULT_BRANCH: Base branch (default: main)
```

### 6. Error Handling
- **Notion API Error**: Retry mechanism, Slack notification (optional)
- **PR Creation Error**: Check existing branch/PR existence, appropriate error messages
- **Script Execution Error**: Determination by exit code, log output

### 7. Duplicate Prevention Features
- **Same-day duplicate PR prevention**: Check existing open PRs
- **Branch name uniqueness**: Timestamp-based branch names
- **Skip when no changes**: Don't create PR when no changes (except with force_pr)

### 8. Act Verification Support
```yaml
# .actrc file configuration
-P ubuntu-latest=catthehacker/ubuntu:act-latest
--container-daemon-socket /var/run/docker.sock

# secrets.env file (for local verification)
NOTION_API_KEY=test_token_for_local_dev
```

### 9. Output & Notifications
- **On success**: Output PR URL to workflow
- **On failure**: Output error details to workflow
- **No changes**: "No changes detected" message

### 10. Configurable Items
- Execution schedule
- PR creation threshold (minimum change count)
- Branch name prefix
- Report file storage location
- Automatic PR reviewer assignment

## Technical Considerations

### GitHub Actions Specific
- `actions/checkout@v4`
- `actions/setup-node@v4` 
- `gh` CLI for PR creation

### Integration with Existing Code
- Utilize `npm run generate-report`
- Determine change presence by exit code
- Utilize artifacts in `reports/` directory

### Security
- Notion Token Secrets management
- Appropriate GitHub Token scope configuration
- Prevent automatic PR approval

## Implementation Order
1. Create basic workflow file
2. Integrate change detection logic
3. Implement PR creation functionality
4. Add error handling
5. Build act verification environment
6. Implement duplicate prevention features
7. Organize documentation

## Verification Plan
1. **Local Verification (using act)**
   - Both scenarios with/without changes
   - Verify manual execution trigger operation
   - Verify error cases

2. **Verification on GitHub**
   - Actual scheduled execution
   - Verify PR creation operation
   - Verify security settings