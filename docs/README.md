# Documentation Index

Welcome to the Notion Change Detector documentation! This page provides an organized overview of all available documentation to help you understand, set up, and use the system effectively.

## 📋 Getting Started

### [Project Requirements](./PROJECT_REQUIREMENTS.md)
Comprehensive overview of project goals, functional and non-functional requirements, and technical specifications. Essential reading for understanding the project's purpose and scope.

**When to read**: Before starting development or when you need to understand the project's objectives.

### [Testing Strategy](./TESTING_STRATEGY.md)
Complete testing approach including unit testing, integration testing, and test-driven development (TDD) methodology used throughout the project.

**When to read**: When contributing to the project or setting up the development environment.

## 🔧 Development & Testing

### [Vitest Guide](./VITEST_GUIDE.md)
Detailed guide to the Vitest testing framework used in this project, including setup, configuration, and best practices.

**When to read**: When writing or running tests, or when you're new to Vitest.

## 🚀 GitHub Actions & Automation

### [GitHub Actions Setup Guide](./github-actions-setup.md)
Step-by-step instructions for setting up automated Notion monitoring with GitHub Actions, including secrets configuration and workflow deployment.

**When to read**: When deploying the application for automated monitoring in a GitHub repository.

### [Local Testing with Act](./local-testing-with-act.md)
Comprehensive guide to testing GitHub Actions workflows locally using the `act` tool, including setup, configuration, and troubleshooting.

**When to read**: When you need to test GitHub Actions workflows locally before deploying to GitHub.

### [GitHub Actions Testing Guide](./github-actions-testing-guide.md)
Safety-focused testing methodology for GitHub Actions workflows, including staging strategies, risk mitigation, and debugging techniques.

**When to read**: When you need to safely test GitHub Actions in production environments.

### [GitHub Actions Architecture](./github-actions-architecture.md)
Technical architecture document for the GitHub Actions automation system, including design decisions, implementation details, and technical specifications.

**When to read**: For detailed technical understanding of the automation system or when making architectural changes.

## 📚 Documentation Categories

### 🏗️ Architecture & Planning
- [Project Requirements](./PROJECT_REQUIREMENTS.md) - Project scope and objectives
- [GitHub Actions Architecture](./github-actions-architecture.md) - Automation system architecture

### 🧪 Development & Testing  
- [Testing Strategy](./TESTING_STRATEGY.md) - Overall testing approach
- [Vitest Guide](./VITEST_GUIDE.md) - Testing framework documentation

### 🚀 Deployment & Operations
- [GitHub Actions Setup Guide](./github-actions-setup.md) - Production deployment
- [Local Testing with Act](./local-testing-with-act.md) - Local workflow testing
- [GitHub Actions Testing Guide](./github-actions-testing-guide.md) - Safe testing practices

## 🗺️ Documentation Roadmap

### For New Users
1. [Project Requirements](./PROJECT_REQUIREMENTS.md) - Understand what the system does
2. [GitHub Actions Setup Guide](./github-actions-setup.md) - Get it running
3. [Testing Strategy](./TESTING_STRATEGY.md) - Learn the development approach

### For Developers
1. [Testing Strategy](./TESTING_STRATEGY.md) - Development methodology
2. [Vitest Guide](./VITEST_GUIDE.md) - Testing framework
3. [GitHub Actions Architecture](./github-actions-architecture.md) - Technical architecture

### For DevOps/Deployment
1. [GitHub Actions Setup Guide](./github-actions-setup.md) - Production deployment
2. [Local Testing with Act](./local-testing-with-act.md) - Local validation
3. [GitHub Actions Testing Guide](./github-actions-testing-guide.md) - Safe testing practices

## 🆘 Quick Help

### I want to...
- **Understand what this project does** → [Project Requirements](./PROJECT_REQUIREMENTS.md)
- **Set up automated monitoring** → [GitHub Actions Setup Guide](./github-actions-setup.md)
- **Test workflows locally** → [Local Testing with Act](./local-testing-with-act.md)
- **Write or run tests** → [Vitest Guide](./VITEST_GUIDE.md)
- **Understand the architecture** → [GitHub Actions Architecture](./github-actions-architecture.md)
- **Safely test in production** → [GitHub Actions Testing Guide](./github-actions-testing-guide.md)
- **Learn the testing approach** → [Testing Strategy](./TESTING_STRATEGY.md)

## 📝 Contributing to Documentation

When adding new documentation:

1. **Create the document** in the appropriate format (Markdown preferred)
2. **Add it to this index** with a clear description
3. **Update the roadmap sections** if it affects user workflows
4. **Cross-link** with related documents when relevant

### Documentation Standards
- Use clear, descriptive titles
- Include "When to read" sections for guidance
- Provide step-by-step instructions where applicable
- Include troubleshooting sections for complex processes
- Add code examples and configuration snippets

## 🔗 External Resources

- [Notion API Documentation](https://developers.notion.com/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vitest Documentation](https://vitest.dev/)
- [Act (GitHub Actions Local Testing)](https://nektosact.com/)

---

📍 **Location**: This documentation is maintained in the `docs/` directory of the project repository.

🔄 **Last Updated**: Updated for GitHub Actions automation implementation completion.