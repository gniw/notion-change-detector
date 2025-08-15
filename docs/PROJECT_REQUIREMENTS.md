# Project Requirements

## Project Purpose

Build an automated system that automatically detects changes in Notion databases, summarizes change content in Markdown format, and visualizes it as GitHub Pull Requests.

### Functions to Implement
1. Access Notion API and check if there are changes in target databases
2. If changes exist, summarize change content in Markdown format
3. Create GitHub PR using the created Markdown for reviewable state
4. Repeat the above process daily at the same time
5. If created PR is not merged and further changes are detected in subsequent checks, append changes to existing PR content

## Functional Requirements

### 1. Notion Change Detection
- **Purpose**: Detect changes in target databases
- **Required Functions**:
  - Notion API client initialization
  - Database information retrieval
  - Difference detection from previous retrieval
  - Change state persistence (file or DB)

### 2. Markdown Generation
- **Purpose**: Output change content in highly readable Markdown
- **Required Functions**:
  - Identification of newly added, updated, and deleted pages
  - Extraction of page property change details
  - Templated Markdown generation

### 3. GitHub PR Creation & Update
- **Purpose**: Automatically create and update PRs with change content
- **Required Functions**:
  - GitHub API client
  - Existing PR search functionality
  - New PR creation functionality
  - Existing PR update functionality (content appending)
  - Branch management

### 4. Scheduling Function
- **Purpose**: Daily scheduled execution
- **Required Functions**:
  - Cron expression or timer-based periodic execution
  - Process management
  - Error handling and retry functionality

### 5. State Management
- **Purpose**: Execution history and state management
- **Required Functions**:
  - Save database state from previous execution
  - Management of created PR information
  - Recording of execution logs and error logs

## Technical Requirements

### Environment Variables
```
NOTION_API_KEY=<Notion integration token>
GITHUB_TOKEN=<GitHub Personal Access Token>
NOTION_DATABASE_ID=<Target database ID for monitoring>
GITHUB_OWNER=<GitHub repository owner>
GITHUB_REPO=<GitHub repository name>
```

### Additional Libraries
- `@octokit/rest` - GitHub API client
- `node-cron` - Scheduler for periodic execution
- For data persistence (JSON files or SQLite)

### Architecture
```
src/
├── notion/
│   ├── client.ts          # Notion API client
│   ├── database.ts        # Database operations
│   └── differ.ts          # Difference detection logic
├── github/
│   ├── client.ts          # GitHub API client
│   └── pr-manager.ts      # PR creation and update
├── markdown/
│   └── generator.ts       # Markdown generation
├── storage/
│   └── state-manager.ts   # State management
├── scheduler/
│   └── cron.ts           # Periodic execution
└── index.ts              # Main entry point
```

## Implementation Priority

### Phase 1: Core Functions (Highest Priority)
1. **Notion API Client** - Foundation for API access
2. **Database Retrieval Function** - Basic data retrieval
3. **State Management Function** - Save previous state for difference detection

### Phase 2: Difference Detection and Markdown Generation
4. **Difference Detection Logic** - Change identification
5. **Markdown Generation** - Making change content readable

### Phase 3: GitHub Actions Integration
6. **GitHub API Client** - Foundation for PR operations
7. **PR Creation/Update Function** - Automated PR management

### Phase 4: Automation
8. **Scheduling Function** - Periodic execution
9. **Error Handling** - Robustness improvement

## TDD Approach

### Development Process
Develop each function in the following order:
1. **Create Test Cases** - Define expected behavior
2. **Minimal Implementation** - Minimal code that passes tests
3. **Refactoring** - Improve code quality
4. **Integration Testing** - Verify inter-function coordination

### Starting Point
Begin TDD implementation with Phase 1's Notion API client.

## Major Technical Challenges

- Notion API pagination processing
- GitHub API authentication and rate limiting
- Efficient difference detection for large data
- Ensuring stability of long-running processes