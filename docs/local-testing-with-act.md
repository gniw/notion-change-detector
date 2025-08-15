# Local Testing with Act

> 📋 **Documentation Index**: [← Back to Documentation Index](./README.md)

This document explains how to use [act](https://github.com/nektos/act) to test GitHub Actions workflows locally.

## Prerequisites

### 1. Install act

For macOS:
```bash
brew install act
```

For other platforms:
- See the [official installation guide](https://nektosact.com/installation/index.html)

### 2. Docker Setup

Act uses Docker to emulate GitHub Actions runners:
```bash
# Ensure Docker Desktop is running
docker info
```

## Configuration Files

### .actrc
Manage act configuration in the `.actrc` file in the project root directory:

```
-P ubuntu-latest=catthehacker/ubuntu:act-latest
--container-daemon-socket /var/run/docker.sock
--secret-file .env.local
```

### Environment Variables
The existing `.env.local` file is used as secrets during act execution.

## Usage

### Test Manual Execution
```bash
npm run test:act
```
This runs the workflow with the `workflow_dispatch` trigger.

### Test Scheduled Execution
```bash
npm run test:act:schedule
```
This runs the workflow with the `schedule` trigger.

### Custom act Commands
```bash
# Run specific job only
act -j notion-changes

# Run with specific event
act workflow_dispatch

# Run in debug mode
act -v workflow_dispatch

# Dry-run mode
act -n workflow_dispatch
```

## Common Issues and Solutions

### 1. Docker Image Download Error
Large Docker images need to be downloaded on first run:
```bash
docker pull catthehacker/ubuntu:act-latest
```

### 2. GitHub API Token Error
A GitHub personal access token is required to test PR creation features:
```bash
# Add to .env.local
GITHUB_TOKEN=your_personal_access_token_here
```

### 3. Permission Errors
```bash
# Check Docker socket permissions
sudo chown $(whoami) /var/run/docker.sock
```

### 4. Secret Files Not Found
Ensure the `.env.local` file exists:
```bash
# Check .env.local file existence
ls -la .env.local
```

## Important Notes

### Security
- Local testing still calls the actual Notion API
- PR creation tests may create actual branches/PRs in the GitHub repository
- Recommend testing with test repositories or branches

### Limitations
- Some `github.context` values may differ in local environment
- Some GitHub hosted runner features are not available
- Network settings may restrict API access

## Debugging

### Check Logs
```bash
# Output detailed logs
act workflow_dispatch -v

# Check step-by-step execution
act workflow_dispatch --verbose
```

### Partial Workflow Execution
```bash
# Execute ignoring gitignore
act workflow_dispatch --use-gitignore=false
```

## Additional Resources

- [act Official Documentation](https://nektosact.com/)
- [GitHub Actions Syntax and act Support](https://docs.github.com/en/actions/learn-github-actions/understanding-github-actions)
- [catthehacker/ubuntu Images](https://github.com/catthehacker/docker_images)