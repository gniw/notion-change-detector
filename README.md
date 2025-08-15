# Notion Change Detector

A comprehensive Node.js TypeScript application that automatically detects changes in Notion databases and generates detailed markdown reports. Features GitHub Actions automation for scheduled monitoring and pull request creation.

## 🚀 Features

### Core Functionality
- **Multi-Database Monitoring**: Track changes across multiple Notion databases
- **Detailed Change Detection**: Property-level change tracking with before/after comparisons
- **Rich Markdown Reports**: Generate comprehensive reports with timestamps and change summaries
- **State Management**: Persistent state tracking to detect incremental changes

### Advanced Features
- **Property Change Tracking**: See exactly what properties changed from what to what
- **Relation Property Handling**: Smart handling of Notion relation properties
- **Initial Properties Display**: View initial properties for newly added pages
- **Simplified Timestamp Display**: Human-readable date/time formatting

### Automation & CI/CD
- **GitHub Actions Integration**: Automated scheduled monitoring
- **Pull Request Creation**: Automatic PR creation when changes are detected
- **Local Testing with Act**: Test GitHub Actions workflows locally
- **Error Handling & Retry Logic**: Robust error handling with proper notifications

## 📋 Prerequisites

- Node.js 18 or higher
- Notion API integration token
- Access to Notion databases you want to monitor

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd notion-change-detector
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Notion API token
   ```

4. **Configure databases**
   ```bash
   # Edit notion-databases.json with your database IDs
   ```

## ⚙️ Configuration

### Environment Variables

Create `.env.local` with:
```env
NOTION_API_KEY=your_notion_api_token_here
```

### Database Configuration

Edit `notion-databases.json`:
```json
{
  "databases": [
    {
      "id": "your-database-id",
      "name": "Your Database Name"
    }
  ]
}
```

## 🚀 Usage

### Manual Execution
```bash
# Generate a change report
npm run generate-report

# Run in development mode
npm run dev

# Build for production
npm run build
npm start
```

### Automated Monitoring (GitHub Actions)

1. **Set up GitHub Secrets**:
   - `NOTION_API_KEY`: Your Notion API token

2. **Enable Actions**: The workflow runs automatically:
   - **Schedule**: Daily at 9:00 AM and 6:00 PM JST
   - **Manual**: Via GitHub Actions UI with `workflow_dispatch`

3. **Review PRs**: When changes are detected, a PR is automatically created with the report

For detailed setup instructions, see [GitHub Actions Setup Guide](./docs/github-actions-setup.md).

## 🧪 Testing

### Unit Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### GitHub Actions Testing (Local)
```bash
# Test workflow locally with act
npm run test:act

# Test scheduled workflow
npm run test:act:schedule
```

For local testing setup, see [Local Testing with Act](./docs/local-testing-with-act.md).

## 📁 Project Structure

```
├── src/
│   ├── config/          # Configuration management
│   ├── markdown/        # Report generation
│   ├── notion/          # Notion API integration
│   └── storage/         # State management
├── tests/
│   ├── github-actions/  # Workflow tests  
│   ├── integration/     # Integration tests
│   └── unit tests for each module
├── .github/
│   └── workflows/       # GitHub Actions workflows
├── docs/                # Documentation
└── reports/             # Generated reports
```

## 📊 Generated Reports

Reports include:
- **Summary statistics** (added, updated, deleted pages)
- **Database-wise breakdowns**
- **Property change details** with before/after values
- **Initial properties** for newly added pages
- **Human-readable timestamps**

Example report structure:
- 📊 Overall summary
- 📋 Database details
- 📝 Added pages with initial properties
- 🔄 Updated pages with property changes
- 🗑️ Deleted pages

## 🔧 Development

### Available Scripts
- `npm run dev` - Development mode with hot reload
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run lint` - Lint code
- `npm run format` - Format code

### Code Quality
- **TypeScript**: Full type safety
- **ESLint + Biome**: Code linting and formatting
- **Vitest**: Fast unit testing framework
- **TDD Approach**: Test-driven development

## 📚 Documentation

### 📋 [Complete Documentation Index](./docs/README.md)
Organized overview of all documentation with usage guidance and roadmaps.

### 🚀 Quick Access
- **Getting Started**: [GitHub Actions Setup Guide](./docs/github-actions-setup.md)
- **Local Testing**: [Local Testing with Act](./docs/local-testing-with-act.md)  
- **Development**: [Testing Strategy](./docs/TESTING_STRATEGY.md)
- **Architecture**: [GitHub Actions Architecture](./docs/github-actions-architecture.md)

### 📖 All Documentation
- [Project Requirements](./docs/PROJECT_REQUIREMENTS.md) - Project scope and objectives
- [Testing Strategy](./docs/TESTING_STRATEGY.md) - TDD approach and testing methodology
- [Vitest Guide](./docs/VITEST_GUIDE.md) - Testing framework documentation
- [GitHub Actions Setup](./docs/github-actions-setup.md) - Production deployment guide
- [Local Testing with Act](./docs/local-testing-with-act.md) - Local workflow testing
- [GitHub Actions Testing Guide](./docs/github-actions-testing-guide.md) - Safe testing practices
- [GitHub Actions Architecture](./docs/github-actions-architecture.md) - Technical architecture

## 🔐 Security

- API tokens stored securely in GitHub Secrets
- No sensitive information logged or committed
- Minimal required permissions for GitHub Actions
- Local development uses `.env.local` (gitignored)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📝 License

MIT License - see the [LICENSE](LICENSE) file for details.

## 🛟 Support

For issues and questions:
1. Check the [documentation](./docs/)
2. Search existing [GitHub Issues]
3. Create a new issue with detailed information

## 🏗️ Architecture

This project follows a modular architecture:

- **Configuration Layer**: Multi-database configuration management
- **Data Layer**: Notion API integration with caching
- **Business Logic**: Change detection and comparison algorithms  
- **Presentation Layer**: Markdown report generation
- **Storage Layer**: State persistence and management
- **Automation Layer**: GitHub Actions workflows and local testing

Built with TypeScript for type safety and maintainability.